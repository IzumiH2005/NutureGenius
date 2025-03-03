const TelegramBot = require('node-telegram-bot-api');
const commands = require('./commands');
const db = require('./database');
require('./health'); // Import the health check server

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

console.log('Starting bot initialization...');

// Initialize bot with token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
}

let pollingErrors = 0;
const MAX_POLLING_ERRORS = 5;
let isPolling = false;

// Message cooldown system with per-user tracking
const messageCooldowns = new Map();
const COOLDOWN_TIME = 1000; // 1 second cooldown

function isOnCooldown(chatId, messageType) {
    const key = `${chatId}_${messageType}`;
    const lastTime = messageCooldowns.get(key);
    const now = Date.now();

    if (lastTime && now - lastTime < COOLDOWN_TIME) {
        return true;
    }

    messageCooldowns.set(key, now);
    return false;
}

// Message queue system with per-user tracking
const messageQueue = new Map();
const QUEUE_PROCESS_INTERVAL = 500; // Process queue every 500ms
const MAX_QUEUE_SIZE = 10; // Maximum messages in queue per user

function addToMessageQueue(chatId, message, options = {}) {
    if (!messageQueue.has(chatId)) {
        messageQueue.set(chatId, []);
        console.log(`[Queue Manager] Created new message queue for user ${chatId}`);
    }

    const queue = messageQueue.get(chatId);
    if (queue.length >= MAX_QUEUE_SIZE) {
        console.log(`[Queue Manager] Queue full for user ${chatId}, removing oldest message`);
        queue.shift();
    }

    // Vérifier si un message similaire existe déjà dans la queue
    const isDuplicate = queue.some(item =>
        item.message === message &&
        JSON.stringify(item.options) === JSON.stringify(options)
    );

    if (!isDuplicate) {
        queue.push({
            message,
            options,
            timestamp: Date.now(),
            id: Math.random().toString(36).substring(7) // Unique ID for message
        });
        console.log(`[Queue Manager] Added message to queue for user ${chatId}. Queue size: ${queue.length}`);
    } else {
        console.log(`[Queue Manager] Duplicate message detected and skipped for user ${chatId}`);
    }
}

async function processMessageQueue(chatId) {
    const queue = messageQueue.get(chatId);
    if (!queue || queue.length === 0) return;

    const { message, options, timestamp, id } = queue[0];
    const now = Date.now();
    const messageAge = now - timestamp;

    console.log(`[Queue Manager] Processing message ${id} for user ${chatId}. Message age: ${messageAge}ms`);

    if (messageAge < 100) {
        console.log(`[Queue Manager] Message too new (${messageAge}ms), waiting...`);
        return;
    }

    try {
        if (acquireLock(chatId)) {
            await bot.sendMessage(chatId, message, options);
            queue.shift();
            console.log(`[Queue Manager] Successfully sent message ${id} to user ${chatId}. Remaining in queue: ${queue.length}`);
            releaseLock(chatId);
        }
    } catch (error) {
        console.error(`[Queue Manager] Error sending message ${id} to user ${chatId}:`, error);
        releaseLock(chatId);
        if (messageAge > 3000) {
            queue.shift();
            console.log(`[Queue Manager] Removed failed message ${id} for user ${chatId} after ${messageAge}ms`);
        }
    }

    if (queue.length === 0) {
        messageQueue.delete(chatId);
        console.log(`[Queue Manager] Removed empty queue for user ${chatId}`);
    }
}

const messageLocks = new Map();

// Gestion des verrous pour éviter les doubles messages
function acquireLock(chatId) {
    if (messageLocks.get(chatId)) {
        return false;
    }
    messageLocks.set(chatId, true);
    return true;
}

function releaseLock(chatId) {
    messageLocks.delete(chatId);
}

// Amélioration : Configuration du bot avec options de polling spécifiques
const bot = new TelegramBot(token, {
    polling: false, // Démarrage manuel du polling
    filepath: false, // Désactive le stockage de fichiers local
    webHook: false  // Désactive explicitement le webhook
});

console.log('Bot initialized successfully');

// Function to start polling with improved error handling
async function startPolling() {
    if (isPolling) {
        console.log('Polling already active');
        return;
    }

    try {
        console.log('Starting polling...');

        // Arrêter tout polling existant
        await bot.stopPolling();

        // Nettoyer explicitement les webhooks
        try {
            await bot.deleteWebHook();
            console.log('Webhook deleted successfully');
        } catch (webhookError) {
            console.warn('Error deleting webhook:', webhookError);
        }

        // Attendre un peu avant de redémarrer le polling
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Démarrer le polling avec des options spécifiques
        await bot.startPolling({
            polling: {
                interval: 300, // Intervalle entre les requêtes
                autoStart: true,
                params: {
                    timeout: 10,
                    allowed_updates: ['message', 'callback_query'], // Limite les types de mises à jour
                }
            }
        });

        isPolling = true;
        pollingErrors = 0;
        console.log('Polling started successfully');
    } catch (error) {
        console.error('Error starting polling:', error);
        isPolling = false;
    }
}

// Handle polling errors with improved recovery
bot.on('polling_error', async (error) => {
    console.error('Polling error:', error);
    pollingErrors++;

    if (error.code === 'ETELEGRAM' && error.response?.statusCode === 409) {
        console.log('Conflict detected with another instance, waiting before retry...');
        isPolling = false;
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (pollingErrors >= MAX_POLLING_ERRORS) {
        console.log('Too many polling errors, restarting polling...');
        isPolling = false;
        try {
            await startPolling();
        } catch (error) {
            console.error('Error restarting polling:', error);
        }
    }
});

// Amélioration : Gestion propre de l'arrêt du bot
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

async function gracefulShutdown(signal) {
    console.log(`Received ${signal}, starting graceful shutdown...`);

    try {
        // Arrêter le polling
        isPolling = false;
        await bot.stopPolling();

        // Nettoyer les webhooks
        await bot.deleteWebHook();

        // Vider les queues de messages
        messageQueue.clear();
        messageCooldowns.clear();
        messageLocks.clear();

        console.log('Bot shutdown completed successfully');
    } catch (error) {
        console.error('Error during shutdown:', error);
    } finally {
        process.exit(0);
    }
}

// Start initial polling
startPolling().catch(console.error);

// Handle /start command
bot.onText(/\/start/, async (msg) => {
    if (isOnCooldown(msg.chat.id, 'start')) return;

    const userId = msg.from.id; // ID de l'utilisateur qui a envoyé la commande
    const username = msg.from.first_name || msg.from.username || `User_${userId}`;
    let progress = 0;
    console.log(`Start command received from user ${username} (${userId}) in chat ${msg.chat.id}`);

    // Sauvegarder l'utilisateur avec son ID personnel
    db.saveUser(userId, { username });

    const loadingMsg = await bot.sendMessage(msg.chat.id, 'Load...0%');
    const interval = setInterval(async () => {
        progress += 10;
        if (progress <= 100) {
            try {
                await bot.editMessageText(`Load...${progress}%`, {
                    chat_id: msg.chat.id,
                    message_id: loadingMsg.message_id
                });
            } catch (error) {
                console.error('Error updating loading message:', error);
                clearInterval(interval);
            }
        } else {
            clearInterval(interval);
            try {
                addToMessageQueue(msg.chat.id, "Ce bot est un Bot spécial d'entraînement pour la vitesse et la précision. Cliquez sur continuer pour commencer.", {
                    reply_markup: {
                        inline_keyboard: [[{ text: "Continuer", callback_data: "show_menu" }]]
                    }
                });
            } catch (error) {
                console.error('Error sending continue message:', error);
            }
        }
    }, 500);
});

// Handle callback queries
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;

    // Check cooldown for callback queries
    if (isOnCooldown(chatId, 'callback')) {
        await bot.answerCallbackQuery(query.id);
        return;
    }

    console.log(`Callback query received: ${query.data} from chat ${chatId}`);

    try {
        if (query.data.startsWith('user_stats_')) {
            const username = query.data.split('_')[2];
            const stats = db.getStatsByUsername(username);
            if (stats) {
                await commands.showStats(bot, chatId, username);
            } else {
                await bot.sendMessage(chatId, "Utilisateur non trouvé.");
            }
            await bot.answerCallbackQuery(query.id);
            return;
        }

        if (query.data.startsWith('precision_training_') || query.data.startsWith('speed_training_')) {
            const [type, , rank] = query.data.split('_');
            await commands.startTrainingWithRank(bot, chatId, type, rank);
            await bot.answerCallbackQuery(query.id);
            return;
        }

        // Créer un faux objet msg pour la compatibilité
        const msgObj = {
            chat: { id: chatId },
            from: query.from // Utiliser les informations de l'utilisateur depuis query
        };

        switch (query.data) {
            case 'show_menu':
                await commands.showMenu(bot, chatId);
                break;
            case 'mode_precision':
                await commands.showPrecisionMenu(bot, chatId);
                break;
            case 'mode_speed':
                await commands.showSpeedMenu(bot, chatId);
                break;
            case 'precision_test':
                await commands.startPrecisionTest(bot, chatId, msgObj);
                break;
            case 'speed_test':
                await commands.startSpeedTest(bot, chatId, msgObj);
                break;
            case 'precision_training':
                await commands.startPrecisionTraining(bot, chatId);
                break;
            case 'speed_training':
                await commands.startSpeedTraining(bot, chatId);
                break;
        }

        await bot.answerCallbackQuery(query.id);
    } catch (error) {
        console.error('Error handling callback query:', error);
        await bot.answerCallbackQuery(query.id, { text: "Une erreur s'est produite" });
    }
});

// Handle commands with cooldown
const handleCommand = async (command, handler) => {
    bot.onText(command, async (msg) => {
        const userId = msg.from.id;
        if (isOnCooldown(userId, command)) return;
        console.log(`${command} command received from user ${msg.from.username} (${userId})`);
        await handler(msg);
    });
};

// Handle /training command
handleCommand(/\/training/, async (msg) => {
    await commands.showMenu(bot, msg.chat.id);
});

// Handle /help command
handleCommand(/\/help/, async (msg) => {
    await commands.showHelp(bot, msg.chat.id);
});

// Handle /stats command
handleCommand(/\/stats/, async (msg) => {
    await commands.showStats(bot, msg.chat.id, msg);
});

// Handle /user command (admin only)
handleCommand(/\/user/, async (msg) => {
    if (msg.from.id.toString() === '6419892672') {
        await commands.showUserList(bot, msg.chat.id);
    } else {
        addToMessageQueue(msg.chat.id,
            "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "⛔ 𝗔𝗖𝗖𝗘𝗦 𝗥𝗘𝗙𝗨𝗦É\n\n" +
            "Cette commande est réservée aux administrateurs.\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        );
    }
});

// Handle /end command
handleCommand(/\/end/, async (msg) => {
    const chatId = msg.chat.id;
    const test = db.getActiveTest(chatId);

    if (!test) {
        await bot.sendMessage(chatId, "Aucun test en cours.");
        return;
    }

    // Nettoyer le test sans sauvegarder les stats
    if (test.countdownInterval) {
        clearInterval(test.countdownInterval);
    }
    db.endTest(chatId);

    await bot.sendMessage(chatId,
        "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "❌ 𝗧𝗘𝗦𝗧 𝗔𝗡𝗡𝗨𝗟É\n\n" +
        "Le test en cours a été annulé.\n" +
        "Utilisez /training pour commencer un nouveau test.\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━"
    );
});

// Handle text messages for tests with enhanced session management
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const userId = msg.from.id;
        const nextCommands = ['next', 'nex', 'newt', 'nexr', 'nxt', 'n\'est', 'n\'est\'', '\'est'];

        console.log(`Received message from user ${userId}: "${msg.text}"`);

        // Vérifier d'abord si c'est une commande "next"
        if (nextCommands.includes(msg.text.toLowerCase())) {
            console.log(`Next command detected for user ${userId}`);
            try {
                await handleTestResponse(bot, msg);
            } catch (error) {
                console.error(`Error handling next command for user ${userId}:`, error);
                addToMessageQueue(msg.chat.id, "Une erreur s'est produite. Veuillez réessayer.");
            }
            return;
        }

        // Pour les autres messages, vérifier le test actif
        const test = db.getActiveTest(userId);
        if (!test) {
            console.log(`No active test for user ${userId}, ignoring message`);
            return;
        }

        if (!test.lastQuestionTime) {
            console.log(`No active question for user ${userId}, ignoring message`);
            return;
        }

        // Vérifier si le message est une réponse à une question récente
        const now = Date.now();
        const timeSinceQuestion = now - test.lastQuestionTime;
        if (timeSinceQuestion > 30000) { // 30 secondes maximum pour répondre
            console.log(`Response timeout for user ${userId} (${timeSinceQuestion}ms)`);
            return;
        }

        if (isOnCooldown(userId, 'text')) {
            console.log(`Message cooldown active for user ${userId}`);
            addToMessageQueue(msg.chat.id, "Veuillez attendre un moment avant d'envoyer un nouveau message.");
            return;
        }

        console.log(`Processing valid response from user ${userId}`);
        await handleTestResponse(bot, msg);
    }
});

async function handleTestResponse(bot, msg) {
    const test = db.getActiveTest(msg.chat.id);
    if (!test) {
        console.log(`Ignoring message - no active test for chat ${msg.chat.id}`);
        return;
    }

    // Vérifier si un message est en cours de traitement
    if (!acquireLock(msg.chat.id)) {
        console.log(`Message skipped for chat ${msg.chat.id} - lock active`);
        return;
    }

    try {
        await commands.handleTestResponse(bot, msg);
    } finally {
        // Toujours libérer le verrou à la fin
        releaseLock(msg.chat.id);
    }
}

// Process message queues periodically with enhanced error handling
setInterval(() => {
    for (const chatId of messageQueue.keys()) {
        processMessageQueue(chatId).catch(error => {
            console.error(`Error processing message queue for chat ${chatId}:`, error);
        });
    }
}, QUEUE_PROCESS_INTERVAL);

module.exports = bot;