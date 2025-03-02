const TelegramBot = require('node-telegram-bot-api');
const commands = require('./commands');
const db = require('./database');

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

// Message cooldown system
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

// Message queue system
const messageQueue = new Map();
const QUEUE_PROCESS_INTERVAL = 500; // Process queue every 500ms

function addToMessageQueue(chatId, message, options = {}) {
    if (!messageQueue.has(chatId)) {
        messageQueue.set(chatId, []);
    }
    messageQueue.get(chatId).push({ message, options });
}

async function processMessageQueue(chatId) {
    const queue = messageQueue.get(chatId);
    if (!queue || queue.length === 0) return;

    const { message, options } = queue.shift();
    try {
        await bot.sendMessage(chatId, message, options);
    } catch (error) {
        console.error('Error sending queued message:', error);
    }

    if (queue.length === 0) {
        messageQueue.delete(chatId);
    }
}

// Process message queues periodically
setInterval(() => {
    for (const chatId of messageQueue.keys()) {
        processMessageQueue(chatId);
    }
}, QUEUE_PROCESS_INTERVAL);


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
        console.error('Error handling callback query:', error);
        await bot.answerCallbackQuery(query.id, { text: "Une erreur s'est produite" });
    }
});

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

// Handle text messages for tests with cooldown
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        // Ne traiter que les messages pendant un test actif
        const test = db.getActiveTest(msg.chat.id);
        if (!test) return;

        if (isOnCooldown(msg.chat.id, 'text')) {
            addToMessageQueue(msg.chat.id, "Veuillez attendre un moment avant d'envoyer un nouveau message.");
            return;
        }

        console.log(`Text message received from chat ${msg.chat.id}: ${msg.text.substring(0, 20)}...`);
        await commands.handleTestResponse(bot, msg);
    }
});

module.exports = bot;