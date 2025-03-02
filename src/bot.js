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

const bot = new TelegramBot(token, {
    polling: false // Démarrage manuel du polling
});

console.log('Bot initialized successfully');

// Function to start polling
async function startPolling() {
    if (isPolling) {
        console.log('Polling already active');
        return;
    }

    try {
        console.log('Starting polling...');
        await bot.stopPolling(); // Ensure no existing polling
        // Removed db.cleanup() call to preserve active tests
        await bot.startPolling({
            timeout: 10
        });
        isPolling = true;
        pollingErrors = 0;
        console.log('Polling started successfully');
    } catch (error) {
        console.error('Error starting polling:', error);
        isPolling = false;
    }
}

// Handle polling errors
bot.on('polling_error', async (error) => {
    console.error('Polling error:', error);
    pollingErrors++;

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

// Start initial polling
startPolling().catch(console.error);

// Handle /start command
bot.onText(/\/start/, async (msg) => {
    if (isOnCooldown(msg.chat.id, 'start')) return;

    const chatId = msg.chat.id;
    const username = msg.from.first_name || msg.from.username || `User_${chatId}`;
    let progress = 0;
    console.log(`Start command received from chat ${chatId} (${username})`);

    // Save user immediately with first_name
    db.saveUser(chatId, { username });

    const loadingMsg = await bot.sendMessage(chatId, 'Load...0%');

    const interval = setInterval(async () => {
        progress += 10;
        if (progress <= 100) {
            try {
                await bot.editMessageText(`Load...${progress}%`, {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                });
            } catch (error) {
                console.error('Error updating loading message:', error);
                clearInterval(interval);
            }
        } else {
            clearInterval(interval);
            try {
                addToMessageQueue(chatId, "Ce bot est un Bot spécial d'entraînement pour la vitesse et la précision. Cliquez sur continuer pour commencer.", {
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

// Handle callback queries with improved logging
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    console.log(`[Callback] Received callback query: ${query.data} from chat ${chatId}`);

    // Check cooldown for callback queries
    if (isOnCooldown(chatId, 'callback')) {
        await bot.answerCallbackQuery(query.id);
        console.log(`[Callback] Skipped due to cooldown: ${query.data}`);
        return;
    }

    try {
        // Custom text related callbacks
        if (query.data.startsWith('start_custom_')) {
            console.log(`[Callback] Starting custom test with ID: ${query.data.split('_')[2]}`);
            const textId = query.data.split('_')[2];
            await commands.startCustomTest(bot, chatId, textId);
        }
        else if (query.data.startsWith('ranking_custom_')) {
            console.log(`[Callback] Showing ranking for text ID: ${query.data.split('_')[2]}`);
            const textId = query.data.split('_')[2];
            await commands.showTextRanking(bot, chatId, textId);
        }
        else if (query.data.startsWith('custom_difficulty_')) {
            console.log(`[Callback] Setting difficulty for text`);
            const [, , textId, difficulty] = query.data.split('_');
            await commands.startCustomTestWithDifficulty(bot, chatId, textId, difficulty);
        }

        // Main menu callbacks
        switch (query.data) {
            case 'show_menu':
                console.log(`[Callback] Showing main menu for user ${chatId}`);
                await commands.showMenu(bot, chatId);
                break;
            case 'show_custom_menu':
                console.log(`[Callback] Showing custom menu for user ${chatId}`);
                await commands.showCustomMenu(bot, chatId);
                break;
            case 'custom_new':
                console.log(`[Callback] Starting new custom text for user ${chatId}`);
                await commands.handleNewCustomText(bot, chatId);
                break;
            case 'custom_preset':
                console.log(`[Callback] Showing preset texts for user ${chatId}`);
                await commands.showPresetTexts(bot, chatId);
                break;
            case 'custom_personal':
                console.log(`[Callback] Showing personal texts for user ${chatId}`);
                await commands.showPersonalTexts(bot, chatId);
                break;
            case 'custom_rankings':
                console.log(`[Callback] Showing custom rankings for user ${chatId}`);
                await commands.showCustomTextRankings(bot, chatId);
                break;
            case 'show_leaderboard':
                console.log(`[Callback] Showing leaderboard for user ${chatId}`);
                await commands.showLeaderboard(bot, chatId);
                break;
            case 'mode_precision':
                await commands.showPrecisionMenu(bot, chatId);
                break;
            case 'mode_speed':
                await commands.showSpeedMenu(bot, chatId);
                break;
            case 'precision_test':
                await commands.startPrecisionTest(bot, chatId);
                break;
            case 'precision_training':
                await commands.startPrecisionTraining(bot, chatId);
                break;
            case 'speed_test':
                await commands.startSpeedTest(bot, chatId);
                break;
            case 'speed_training':
                await commands.startSpeedTraining(bot, chatId);
                break;
        }

        await bot.answerCallbackQuery(query.id);
    } catch (error) {
        console.error('[Callback] Error handling callback query:', error);
        await bot.answerCallbackQuery(query.id, { text: "Une erreur s'est produite" });
    }
});

// Message handler with improved logging
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const session = db.getUserSession(msg.chat.id);
        if (!session) {
            console.log(`[Message] No session found for user ${msg.chat.id}`);
            return;
        }

        console.log(`[Message] Processing message from ${msg.chat.id}:`, {
            textLength: msg.text.length,
            sessionState: session.customTextState
        });

        // Handle custom text input first
        if (await commands.handleCustomTextInput(bot, msg)) {
            console.log(`[Message] Handled as custom text input for user ${msg.chat.id}`);
            return;
        }

        const test = db.getActiveTest(msg.chat.id);
        if (!test) return;

        if (isOnCooldown(msg.chat.id, 'text')) {
            addToMessageQueue(msg.chat.id, "Veuillez attendre un moment avant d'envoyer un nouveau message.");
            return;
        }

        console.log(`Text message received from chat ${msg.chat.id}: ${msg.text.substring(0, 20)}...`);
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

// Handle commands with cooldown
const handleCommand = async (command, handler) => {
    bot.onText(command, async (msg) => {
        if (isOnCooldown(msg.chat.id, command)) return;
        console.log(`${command} command received from chat ${msg.chat.id}`);
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
    await commands.showStats(bot, msg.chat.id, msg.from.username);
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

// Handle /leaderboard command
handleCommand(/\/leaderboard/, async (msg) => {
    await commands.showLeaderboard(bot, msg.chat.id);
});

// Handle /custom command
handleCommand(/\/custom/, async (msg) => {
    await commands.showCustomMenu(bot, msg.chat.id);
});


// Process message queues periodically with enhanced error handling
setInterval(() => {
    for (const chatId of messageQueue.keys()) {
        processMessageQueue(chatId).catch(error => {
            console.error(`Error processing message queue for chat ${chatId}:`, error);
        });
    }
}, QUEUE_PROCESS_INTERVAL);

module.exports = bot;