const db = require('./database');
const typingTest = require('./typing_test');
const { words, names } = require('./data/words');
const gemini = require('./gemini');
const now = require('performance-now');
const fs = require('fs');
const path = require('path');

// Constants for menu and test handling
const REACTION_TIME_MS = 220;
const KEY_PRESS_TIME_MS = 150;

// Calculate time allowed based on rank and word length
function calculateTimeAllowed(rank, wordLength) {
    // Base WPM requirements for each rank
    const rankWPM = {
        'D': 20,
        'C': 35,
        'B': 50,
        'A': 70,
        'S': 80,
        'SR': 90
    };

    const targetWPM = rankWPM[rank] || 20; // Default to D rank if not found
    const charactersPerMinute = targetWPM * 5; // Standard WPM calculation
    const baseTimeSeconds = (wordLength / charactersPerMinute) * 60;

    // Add tolerance margins
    return baseTimeSeconds + ((REACTION_TIME_MS + KEY_PRESS_TIME_MS) / 1000);
}

async function showMenu(bot, chatId) {
    console.log(`Showing menu for chat ${chatId}`);

    const menuText = `☯️ 𝐒𝐇𝐈𝐑𝐎 𝐎𝐍𝐈 - 𝔾𝕌ℕ ℙ𝔸ℝ𝕂 ☯️
━━━━━━━━━━━━━━━━━━━━━━━━
📝 𝗕𝗜𝗘𝗡𝗩𝗘𝗡𝗨𝗘 𝗗𝗔𝗡𝗦 𝗩𝗢𝗧𝗥𝗘 𝗗𝗢𝗝𝗢 𝗗'𝗘𝗫𝗖𝗘𝗟𝗟𝗘𝗡𝗖𝗘

Maîtrisez les deux piliers fondamentaux :
• 白  - La précision implacable
• 鬼  - La vitesse foudroyante

🎯 𝗢𝗕𝗝𝗘𝗖𝗧𝗜𝗙 𝗨𝗟𝗧𝗜𝗠𝗘 : Atteindre la perfection Gun Park
Devenez un véritable Shiro Oni, où chaque frappe est à la fois 
précise comme une lame et rapide comme l'éclair.

━━━━━━━━━━━━━━━━━━━━━━━━

📜 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗘𝗦 𝗣𝗥𝗜𝗡𝗖𝗜𝗣𝗔𝗟𝗘𝗦 :

/training - 🥋 Menu d'entraînement complet
/stats - 📊 Analyser vos performances
/help - 📚 Guide détaillé et techniques avancées
/user - 👑 Administration (réservé aux administrateurs)

━━━━━━━━━━━━━━━━━━━━━━━━

"𝙏𝙝𝙚 𝙬𝙤𝙧𝙡𝙙 𝙞𝙨 𝙖𝙡𝙡 𝙖𝙗𝙤𝙪𝙩 𝙧𝙚𝙨𝙪𝙡𝙩𝙨."
                                           - Gun Park

━━━━━━━━━━━━━━━━━━━━━━━━

𝐂𝐨𝐧ç𝐮 𝐩𝐚𝐫 𝐈𝐳𝐮𝐦𝐢 𝐇𝐞𝐚𝐭𝐡𝐜𝐥𝐢𝐟𝐟 © 2025
𝑽𝒆𝒓𝒔𝒊𝒐𝒏 0.1 | 𝑺𝒉𝒊𝒓𝒐 𝑶𝒏𝒊 𝑮𝒓𝒐𝒖𝒑`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "🎯 Mode Précision", callback_data: "mode_precision" },
                { text: "⚡ Mode Vitesse", callback_data: "mode_speed" }
            ]
        ]
    };

    try {
        const imagePath = path.join(__dirname, '../attached_assets/4c85c30fcb415b7bea09eaad3db7a35a (1).jpg');
        await bot.sendPhoto(chatId, imagePath, {
            caption: menuText,
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending menu with image:', error);
        await bot.sendMessage(chatId, menuText, {
            reply_markup: keyboard,
            parse_mode: 'Markdown'
        });
    }
}

async function showPrecisionMenu(bot, chatId) {
    const menuText = `🎯 𝐌𝐨𝐝𝐞 𝐏𝐫é𝐜𝐢𝐬𝐢𝐨𝐧 - 白 (𝐒𝐡𝐢𝐫𝐨)
    
━━━━━━━━━━━━━━━━━━━━━━━━
    
𝗟𝗔 𝗩𝗢𝗜𝗘 𝗗𝗘 𝗟𝗔 𝗣𝗥É𝗖𝗜𝗦𝗜𝗢𝗡
    
La précision est le fondement de la maîtrise.
Un Shiro Oni doit maintenir une précision parfaite 
même à grande vitesse.
    
💡 "𝘓𝘢 𝘷𝘪𝘵𝘦𝘴𝘴𝘦 𝘴𝘢𝘯𝘴 𝘱𝘳é𝘤𝘪𝘴𝘪𝘰𝘯 𝘯'𝘦𝘴𝘵 𝘲𝘶𝘦 𝘤𝘩𝘢𝘰𝘴"
    
━━━━━━━━━━━━━━━━━━━━━━━━
    
𝗖𝗛𝗢𝗜𝗦𝗜𝗦𝗦𝗘𝗭 𝗩𝗢𝗧𝗥𝗘 É𝗣𝗥𝗘𝗨𝗩𝗘 :`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "📝 Test de niveau", callback_data: "precision_test" },
                { text: "🎯 Entraînement", callback_data: "precision_training" }
            ],
            [
                { text: "⬅️ Retour au menu", callback_data: "show_menu" }
            ]
        ]
    };

    await bot.sendMessage(chatId, menuText, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
    });
}

async function showSpeedMenu(bot, chatId) {
    const menuText = `⚡ 𝐌𝐨𝐝𝐞 𝐕𝐢𝐭𝐞𝐬𝐬𝐞 - 鬼 (𝐎𝐧𝐢)
    
━━━━━━━━━━━━━━━━━━━━━━━━
    
𝗟𝗔 𝗩𝗢𝗜𝗘 𝗗𝗘 𝗟𝗔 𝗩𝗜𝗧𝗘𝗦𝗦𝗘
    
La vitesse est le chemin vers la transcendance.
Un véritable Oni frappe avec la rapidité de l'éclair.
    
💡 "𝘓𝘢 𝘷𝘪𝘵𝘦𝘴𝘴𝘦 𝘦𝘴𝘵 𝘭'𝘦𝘴𝘴𝘦𝘯𝘤𝘦 𝘥𝘶 𝘤𝘰𝘮𝘣𝘢𝘵"
    
━━━━━━━━━━━━━━━━━━━━━━━━
    
𝗖𝗛𝗢𝗜𝗦𝗜𝗦𝗦𝗘𝗭 𝗩𝗢𝗧𝗥𝗘 É𝗣𝗥𝗘𝗨𝗩𝗘 :`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "⚡ Test de niveau", callback_data: "speed_test" },
                { text: "🔥 Entraînement", callback_data: "speed_training" }
            ],
            [
                { text: "⬅️ Retour au menu", callback_data: "show_menu" }
            ]
        ]
    };

    await bot.sendMessage(chatId, menuText, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
    });
}

async function showStats(bot, chatId, username) {
    console.log(`Showing stats for user ${username}`);
    const stats = db.getStats(chatId);

    if (!stats) {
        await bot.sendMessage(chatId,
            "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "📊 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗤𝗨𝗘𝗦\n\n" +
            "Aucune statistique disponible.\n" +
            "Commencez l'entraînement pour obtenir vos stats!\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        return;
    }

    let statsMessage = "━━━━━━━━━━━━━━━━━━━━━━━━\n";
    statsMessage += "📊 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗤𝗨𝗘𝗦\n\n";
    statsMessage += `𝗨𝗧𝗜𝗟𝗜𝗦𝗔𝗧𝗘𝗨𝗥: ${username}\n\n`;

    if (stats.precision) {
        statsMessage += "🎯 𝗧𝗘𝗦𝗧 𝗗𝗘 𝗣𝗥É𝗖𝗜𝗦𝗜𝗢𝗡\n";
        statsMessage += `⚡ Vitesse: ${stats.precision.wpm} WPM\n`;
        statsMessage += `📝 Précision: ${stats.precision.accuracy}%\n`;
        statsMessage += `🏆 Rang: ${stats.precision.rank}\n\n`;
    }

    if (stats.speed) {
        statsMessage += "⚡ 𝗧𝗘𝗦𝗧 𝗗𝗘 𝗩𝗜𝗧𝗘𝗦𝗦𝗘\n";
        statsMessage += `⚡ Vitesse: ${stats.speed.wpm} WPM\n`;
        statsMessage += `📝 Précision: ${stats.speed.accuracy}%\n`;
        statsMessage += `🏆 Rang: ${stats.speed.rank}\n\n`;
    }

    if (stats.speed?.wpm >= 76) {
        statsMessage += "🔥 Badge obtenu: 白鬼 (Shiro Oni)";
    }

    statsMessage += "\n━━━━━━━━━━━━━━━━━━━━━━━━";

    await bot.sendMessage(chatId, statsMessage);
}

async function showUserList(bot, chatId) {
    console.log(`Showing user list for admin ${chatId}`);
    const users = db.getAllUsers();

    if (users.length === 0) {
        await bot.sendMessage(chatId,
            "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "👑 𝗔𝗗𝗠𝗜𝗡𝗜𝗦𝗧𝗥𝗔𝗧𝗜𝗢𝗡\n\n" +
            "Aucun utilisateur enregistré.\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        return;
    }

    const keyboard = {
        inline_keyboard: users.map(user => [{
            text: user.username || `User ${user.id}`,
            callback_data: `user_stats_${user.id}`
        }])
    };

    await bot.sendMessage(chatId,
        "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "👑 𝗔𝗗𝗠𝗜𝗡𝗜𝗦𝗧𝗥𝗔𝗧𝗜𝗢𝗡\n\n" +
        "Sélectionnez un utilisateur pour voir ses statistiques:\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        { reply_markup: keyboard }
    );
}

async function startPrecisionTest(bot, chatId) {
    const testWords = words.sort(() => 0.5 - Math.random()).slice(0, 10);
    const username = (await bot.getChat(chatId)).username || `User_${chatId}`;
    db.startTest(chatId, 'precision', testWords, username);

    const instructionsMessage = `━━━━━━━━━━━━━━━━━━━━━━━━
🎯 𝗧𝗘𝗦𝗧 𝗗𝗘 𝗣𝗥É𝗖𝗜𝗦𝗜𝗢𝗡

𝗢𝗕𝗝𝗘𝗖𝗧𝗜𝗙𝗦:
• Recopier chaque mot avec une précision parfaite
• Les accents sont optionnels
• La vitesse est mesurée mais la précision est primordiale

𝗥È𝗚𝗟𝗘𝗦:
• Minimum 70% de précision pour réussir
• La vitesse influence votre rang final
• Concentrez-vous sur chaque caractère

━━━━━━━━━━━━━━━━━━━━━━━━

Écrivez 'next' pour commencer.`;

    await bot.sendMessage(chatId, instructionsMessage);
}

async function startSpeedTest(bot, chatId) {
    const testTexts = [];
    const desiredQuestions = 10;
    const username = (await bot.getChat(chatId)).username || `User_${chatId}`;

    // Tentatives de génération avec Gemini et fallback sur les noms
    for (let i = 0; i < desiredQuestions; i++) {
        try {
            // Alterner entre Gemini et noms de la base de données
            if (i % 2 === 0) {
                console.log(`Tentative de génération Gemini pour la question ${i + 1}`);
                const text = await gemini.generateText();
                if (text) {
                    console.log(`Texte Gemini généré: ${text}`);
                    testTexts.push(text);
                    continue;
                }
            }
            // Fallback sur les noms si Gemini échoue ou pour alterner
            const randomName = names[Math.floor(Math.random() * names.length)];
            console.log(`Utilisation du nom: ${randomName}`);
            testTexts.push(randomName);
        } catch (error) {
            console.error('Erreur lors de la génération du texte:', error);
            // Fallback sur les noms en cas d'erreur
            const randomName = names[Math.floor(Math.random() * names.length)];
            console.log(`Fallback sur le nom: ${randomName}`);
            testTexts.push(randomName);
        }
    }

    db.startTest(chatId, 'speed', testTexts, username);

    const instructionsMessage = `━━━━━━━━━━━━━━━━━━━━━━━━
⚡ 𝗧𝗘𝗦𝗧 𝗗𝗘 𝗩𝗜𝗧𝗘𝗦𝗦𝗘

𝗢𝗕𝗝𝗘𝗖𝗧𝗜𝗙𝗦:
• Taper le plus rapidement possible
• Maintenir une précision minimum de 70%
• Atteindre le meilleur WPM possible

𝗥È𝗚𝗟𝗘𝗦:
• La vitesse détermine votre rang
• La précision reste importante
• Chaque milliseconde compte

━━━━━━━━━━━━━━━━━━━━━━━━

Écrivez 'next' pour commencer.`;

    await bot.sendMessage(chatId, instructionsMessage);
}

async function startPrecisionTraining(bot, chatId) {
    const ranks = ['D', 'C', 'B', 'A', 'S', 'SR'];
    const keyboard = {
        inline_keyboard: ranks.map(rank => [{
            text: rank,
            callback_data: `precision_training_${rank}`
        }])
    };

    await bot.sendMessage(chatId,
        "Choisissez votre niveau actuel pour adapter l'entraînement:",
        { reply_markup: keyboard }
    );
}

async function startSpeedTraining(bot, chatId) {
    const ranks = ['D', 'C', 'B', 'A', 'S', 'SR'];
    const keyboard = {
        inline_keyboard: ranks.map(rank => [{
            text: rank,
            callback_data: `speed_training_${rank}`
        }])
    };

    await bot.sendMessage(chatId,
        "Choisissez votre niveau actuel pour adapter l'entraînement:",
        { reply_markup: keyboard }
    );
}

async function startTrainingWithRank(bot, chatId, type, rank) {
    const testWords = type === 'precision' ?
        words.sort(() => 0.5 - Math.random()).slice(0, 10) :
        await generateSpeedTestWords();

    const username = (await bot.getChat(chatId)).username || `User_${chatId}`;
    db.startTest(chatId, `${type}_training`, testWords, username);
    db.saveUser(chatId, { selectedRank: rank });

    await bot.sendMessage(chatId,
        `Entraînement de ${type === 'precision' ? 'précision' : 'vitesse'} niveau ${rank}\n` +
        "Écrivez 'next' pour commencer.");
}

async function generateSpeedTestWords() {
    const testTexts = [];
    const desiredQuestions = 10;
    let geminiErrors = 0;
    const maxGeminiErrors = 3;

    // Tentatives de génération avec Gemini et fallback sur les noms
    for (let i = 0; i < desiredQuestions; i++) {
        try {
            // Alterner entre Gemini et noms, sauf si trop d'erreurs Gemini
            if (i % 2 === 0 && geminiErrors < maxGeminiErrors) {
                console.log(`Tentative de génération Gemini pour la question ${i + 1}`);
                const text = await gemini.generateText();
                if (text) {
                    console.log(`Texte Gemini généré: ${text}`);
                    testTexts.push(text);
                    continue;
                } else {
                    geminiErrors++;
                }
            }
            // Fallback sur les noms si Gemini échoue ou pour alterner
            const randomName = names[Math.floor(Math.random() * names.length)];
            console.log(`Utilisation du nom: ${randomName}`);
            testTexts.push(randomName);

            // Attendre un peu entre les tentatives si on a eu des erreurs
            if (geminiErrors > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Erreur lors de la génération du texte:', error);
            geminiErrors++;
            // Fallback sur les noms en cas d'erreur
            const randomName = names[Math.floor(Math.random() * names.length)];
            console.log(`Fallback sur le nom: ${randomName}`);
            testTexts.push(randomName);
        }
    }

    if (geminiErrors >= maxGeminiErrors) {
        console.log('Trop d\'erreurs Gemini, utilisation exclusive des noms pour cette session');
    }

    return testTexts;
}

// Dans la fonction handleTestResponse, modifions la vérification de 'next'
async function handleTestResponse(bot, msg) {
    const test = db.getActiveTest(msg.chat.id);
    if (!test) return;

    console.log(`Handling test response for user ${test.username} (${msg.chat.id})`);

    // Liste des variations acceptables de "next"
    const nextCommands = ['next', 'nex', 'newt', 'nexr', 'nxt'];
    if (nextCommands.includes(msg.text.toLowerCase())) {
        if (test.currentIndex >= test.words.length) {
            await finishTest(bot, msg.chat.id);
            return;
        }

        const startTime = now();
        test.startTime = startTime;

        const currentWord = test.words[test.currentIndex];
        const user = db.getUser(msg.chat.id);

        if (user?.selectedRank && test.type.includes('training')) {
            const timeAllowed = calculateTimeAllowed(user.selectedRank, currentWord.length);
            test.timeAllowed = timeAllowed;

            // Start countdown
            const countdownMsg = await bot.sendMessage(msg.chat.id,
                `Q/ ${currentWord}\nTemps restant: ${timeAllowed.toFixed(1)}s`
            );

            // Update countdown
            const interval = setInterval(async () => {
                const elapsed = (now() - startTime) / 1000;
                const remaining = timeAllowed - elapsed;

                if (remaining <= 0) {
                    clearInterval(interval);
                    await bot.editMessageText(
                        `Q/ ${currentWord}\nTemps écoulé! ⏰`,
                        { chat_id: msg.chat.id, message_id: countdownMsg.message_id }
                    );
                    test.currentIndex++;
                    await bot.sendMessage(msg.chat.id, "Écrivez 'next' pour continuer.");
                } else {
                    await bot.editMessageText(
                        `Q/ ${currentWord}\nTemps restant: ${remaining.toFixed(1)}s`,
                        { chat_id: msg.chat.id, message_id: countdownMsg.message_id }
                    );
                }
            }, 1000);

            test.countdownInterval = interval;
        } else {
            await bot.sendMessage(msg.chat.id, `Q/ ${currentWord}`);
        }
        return;
    }

    // Clear any existing countdown
    if (test.countdownInterval) {
        clearInterval(test.countdownInterval);
    }

    const currentWord = test.words[test.currentIndex];
    const endTime = now();
    const responseTime = (endTime - test.startTime) / 1000;
    const adjustedTime = responseTime - ((REACTION_TIME_MS + KEY_PRESS_TIME_MS) / 1000);

    console.log(`Processing response for word "${currentWord}" from user ${test.username}`);

    const accuracy = typingTest.calculateAccuracy(currentWord, msg.text);
    const wpm = typingTest.calculateWPM(msg.text, adjustedTime);

    // En mode vitesse, seul le WPM compte pour le succès
    let success = test.type.includes('speed') ?
        wpm >= 20 : // Seuil minimum de WPM pour le mode vitesse
        accuracy >= 70; // Seuil de précision pour le mode précision

    if (test.type.includes('training')) {
        const user = db.getUser(msg.chat.id);
        if (user?.selectedRank) {
            success = test.type.includes('speed') ?
                wpm >= 20 && responseTime <= test.timeAllowed :
                accuracy >= 70 && responseTime <= test.timeAllowed;
        }
    }

    db.updateTestResult(msg.chat.id, {
        word: currentWord,
        response: msg.text,
        time: responseTime,
        accuracy,
        wpm,
        success
    });

    const resultMessage = `━━━━━━━━━━━━━━━━━━━━━━━━
RÉСУЛТАТЫ :

🎯 Précision : ${Math.round(accuracy)}%
⚡ Vitesse : ${Math.round(wpm)} WPM
⏱️ Temps total : ${responseTime.toFixed(2)}s
⚡ Temps net (sans marges) : ${adjustedTime.toFixed(2)}s

${success ? '✅ Succès!' : '❌ Essayez encore!'}
━━━━━━━━━━━━━━━━━━━━━━━━

Écrivez 'next' pour continuer.`;

    await bot.sendMessage(msg.chat.id, resultMessage);

    test.currentIndex++;

    if (test.currentIndex >= test.words.length) {
        await finishTest(bot, msg.chat.id);
    }
}

async function finishTest(bot, chatId) {
    const test = db.endTest(chatId);
    if (!test) return;

    await bot.sendMessage(chatId, "𝙰𝙽𝙰𝙻𝚈𝚂𝙴 𝙴𝙽 𝙲𝙾𝚄𝚁𝚂...");

    setTimeout(async () => {
        const avgWpm = test.results.reduce((sum, r) => sum + r.wpm, 0) / test.results.length;
        const avgAccuracy = test.results.reduce((sum, r) => sum + r.accuracy, 0) / test.results.length;
        const mode = test.type.includes('speed') ? 'speed' : 'precision';
        const rank = typingTest.getRankFromStats(avgWpm, avgAccuracy, mode);

        const stats = {
            wpm: Math.round(avgWpm),
            accuracy: Math.round(avgAccuracy),
            successCount: test.successCount,
            totalTests: test.words.length,
            rank
        };

        // Utiliser le username stocké dans l'objet test
        db.saveStats(chatId, test.username, test.type, stats);

        const statsMessage = `
        🏯 𝐒𝐇𝐈𝐑𝐎 𝐎𝐍𝐈 - 𝔾𝕌ℕ ℙ𝔸ℝ𝕂
        Test ${test.type === 'speed' ? 'de vitesse' : 'de précision'} terminé!

        ━━━━━━━━━━━━━━━━━━━━━━━━

        📊 𝗥É𝗦𝗨𝗟𝗧𝗔𝗧𝗦 𝗙𝗜𝗡𝗔𝗨𝗫

        ⚡ Vitesse moyenne : ${stats.wpm} WPM
        🎯 Précision : ${stats.accuracy}%
        ✨ Réussites : ${stats.successCount}/${stats.totalTests}

        🏆 Rang obtenu : ${rank}

        ━━━━━━━━━━━━━━━━━━━━━━━━

        Utilisez /training pour continuer l'entraînement
        `;

        await bot.sendMessage(chatId, statsMessage);
    }, 3000);
}

module.exports = {
    showMenu,
    showPrecisionMenu,
    showSpeedMenu,
    startPrecisionTest,
    startSpeedTest,
    startPrecisionTraining,
    startSpeedTraining,
    startTrainingWithRank,
    handleTestResponse,
    showHelp: async (bot, chatId) => {
        await bot.sendMessage(chatId,
            "🏯 Guide d'utilisation - Shiro Oni\n\n" +
            "1. Choisissez votre mode d'entraînement\n" +
            "2. Suivez les instructions à l'écran\n" +
            "3. Tapez les mots exactement comme indiqué\n" +
            "4. Utilisez 'next' entre chaque test\n\n" +
            "📝 Conseils de maître:\n" +
            "• Évitez de regarder votre clavier\n" +
            "• La précision avant la vitesse\n" +
            "• Entraînement régulier = Progression\n" +
            "• Respirez et restez concentré");
    },
    showStats,
    showUserList
};