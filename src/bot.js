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
        db.cleanup(); // Clean up active tests
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
    const chatId = msg.chat.id;
    let progress = 0;
    console.log(`Start command received from chat ${chatId}`);
    const loadingMsg = await bot.sendMessage(chatId, 'Load...0%');

    // Simulate loading progress
    const interval = setInterval(async () => {
        progress += 10;
        if (progress <= 100) {
            await bot.editMessageText(`Load...${progress}%`, {
                chat_id: chatId,
                message_id: loadingMsg.message_id
            });
        } else {
            clearInterval(interval);
            await bot.sendMessage(
                chatId,
                "Ce bot est un Bot spécial d'entraînement pour la vitesse et la précision. Cliquez sur continuer pour commencer.",
                {
                    reply_markup: {
                        inline_keyboard: [[{ text: "Continuer", callback_data: "show_menu" }]]
                    }
                }
            );
        }
    }, 500);
});

// Handle callback queries
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    console.log(`Callback query received: ${query.data} from chat ${chatId}`);

    if (query.data.startsWith('user_stats_')) {
        const userId = query.data.split('_')[2];
        const user = db.getUser(userId);
        if (user) {
            await commands.showStats(bot, chatId, user.username);
        } else {
            await bot.sendMessage(chatId, "Utilisateur non trouvé.");
        }
        return;
    }

    if (query.data.startsWith('precision_training_') || query.data.startsWith('speed_training_')) {
        const [type, , rank] = query.data.split('_');
        await commands.startTrainingWithRank(bot, chatId, type, rank);
        return;
    }

    switch(query.data) {
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
});

// Handle /training command
bot.onText(/\/training/, async (msg) => {
    console.log(`Training command received from chat ${msg.chat.id}`);
    await commands.showMenu(bot, msg.chat.id);
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
    console.log(`Help command received from chat ${msg.chat.id}`);
    await commands.showHelp(bot, msg.chat.id);
});

// Handle /stats command
bot.onText(/\/stats/, async (msg) => {
    console.log(`Stats command received from chat ${msg.chat.id}`);
    await commands.showStats(bot, msg.chat.id, msg.from.username);
});

// Handle /user command (admin only)
bot.onText(/\/user/, async (msg) => {
    console.log(`User command received from chat ${msg.chat.id}`);
    if (msg.from.id.toString() === '6419892672') {
        await commands.showUserList(bot, msg.chat.id);
    } else {
        await bot.sendMessage(msg.chat.id, 
            "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "⛔ 𝗔𝗖𝗖𝗘𝗦 𝗥𝗘𝗙𝗨𝗦É\n\n" +
            "Cette commande est réservée aux administrateurs.\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        );
    }
});

// Handle text messages for tests
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        console.log(`Text message received from chat ${msg.chat.id}: ${msg.text.substring(0, 20)}...`);
        await commands.handleTestResponse(bot, msg);
    }
});

module.exports = bot;