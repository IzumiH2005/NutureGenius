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

// Gestion des verrous pour éviter les doubles messages
const messageLocks = new Map();

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
    const stats = username ? db.getStatsByUsername(username) : db.getStats(chatId);

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
        statsMessage += `🎯 Précision moyenne: ${stats.precision.accuracy}%\n`;
        statsMessage += `🎯 Meilleure précision: ${stats.precision.bestAccuracy}%\n`;
        statsMessage += `⚡ Vitesse: ${stats.precision.wpm} WPM\n`;
        statsMessage += `🏆 Rang: ${stats.precision.rank}\n\n`;
    }

    if (stats.speed) {
        statsMessage += "⚡ 𝗧𝗘𝗦𝗧 𝗗𝗘 𝗩𝗜𝗧𝗘𝗦𝗦𝗘\n";
        statsMessage += `⚡ Vitesse moyenne: ${stats.speed.wpm} WPM\n`;
        statsMessage += `⚡ Meilleure vitesse: ${stats.speed.bestWpm} WPM\n`;
        statsMessage += `🎯 Précision: ${stats.speed.accuracy}%\n`;
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
            text: user.username,
            callback_data: `user_stats_${user.username}`
        }])
    };

    await bot.sendMessage(chatId,
        "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "👑 𝗔𝗗𝗠𝗜𝗡𝗜𝗦𝗧𝗥𝗔𝗧𝗜𝗢𝗡\n\n" +
        "Sélectionnez un utilisateur pour voir ses statistiques:\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━",
        { reply_markup: keyboard }
    );

    console.log('User list keyboard created with users:', users.map(u => u.username).join(', '));
}

async function startPrecisionTest(bot, chatId) {
    const testWords = words.sort(() => 0.5 - Math.random()).slice(0, 10);
    const chat = await bot.getChat(chatId);
    const user = await bot.getChatMember(chatId, chatId);
    const username = user.user.first_name || chat.username || `User_${chatId}`;

    // Sauvegarder le username immédiatement
    db.saveUser(chatId, { username });

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
    const user = await bot.getChatMember(chatId, chatId);
    const username = user.user.first_name || `User_${chatId}`;

    // Sauvegarder le username immédiatement
    db.saveUser(chatId, { username });

    // Utiliser des noms uniquement pour l'initialisation
    for (let i = 0; i < desiredQuestions; i++) {
        const randomName = names[Math.floor(Math.random() * names.length)];
        testTexts.push(randomName);
    }

    // Déterminer le nombre de textes Gemini à générer (entre 3 et 5)
    const numGeminiTexts = Math.floor(Math.random() * 3) + 3; // Génère 3, 4 ou 5
    console.log(`Planning to replace ${numGeminiTexts} words with Gemini texts`);

    // Sélectionner des positions aléatoires pour les textes Gemini
    const positions = [];
    while (positions.length < numGeminiTexts) {
        const pos = Math.floor(Math.random() * desiredQuestions);
        if (!positions.includes(pos)) {
            positions.push(pos);
        }
    }

    // Générer et remplacer les textes aux positions sélectionnées
    for (let i = 0; i < positions.length; i++) {
        try {
            console.log(`Making Gemini request ${i + 1}/${numGeminiTexts} for position ${positions[i]}`);
            const text = await gemini.generateText();

            if (text) {
                console.log(`Successfully generated text at position ${positions[i]}: "${text}"`);
                testTexts[positions[i]] = text;
            } else {
                console.log(`Gemini generation failed for position ${positions[i]}, keeping original word`);
            }
        } catch (error) {
            console.error(`Error generating Gemini text for position ${positions[i]}:`, error);
            // On garde le nom déjà présent en cas d'erreur
        }
    }

    console.log('Initial test texts:', testTexts);
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

async function generateNextTestWord(test) {
    try {
        // 30% de chance d'utiliser Gemini pendant le test
        const useGemini = Math.random() < 0.3;
        console.log(`Test type: ${test.type}, Using Gemini: ${useGemini}`);

        if (useGemini) {
            console.log('Attempting to generate text with Gemini');
            const text = await gemini.generateText();
            if (text) {
                console.log('Successfully generated Gemini text:', text);
                return text;
            }
        }
    } catch (error) {
        console.error('Error generating Gemini text:', error);
    }

    // Fallback sur un nom aléatoire
    const randomName = names[Math.floor(Math.random() * names.length)];
    console.log('Using fallback name:', randomName);
    return randomName;
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
        console.log(`Processing message for chat ${msg.chat.id}: "${msg.text}"`);
        // Liste des variations acceptables de "next"
        const nextCommands = ['next', 'nex', 'newt', 'nexr', 'nxt', 'n\'est', 'n\'est\'', '\'est'];
        if (nextCommands.includes(msg.text.toLowerCase())) {
            if (test.currentIndex >= test.words.length) {
                await finishTest(bot, msg.chat.id);
                return;
            }

            // Nettoyer l'intervalle existant si présent
            if (test.countdownInterval) {
                clearInterval(test.countdownInterval);
                test.countdownInterval = null;
            }

            const startTime = now();
            test.startTime = startTime;

            // Générer dynamiquement le prochain mot si c'est un test de vitesse
            if (test.type === 'speed') {
                console.log('Generating next word for speed test');
                const nextWord = await generateNextTestWord(test);
                test.words[test.currentIndex] = nextWord;
                console.log(`Next word set to: ${nextWord}`);
            }

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
                        try {
                            await bot.editMessageText(
                                `Q/ ${currentWord}\nTemps écoulé! ⏰`,
                                { chat_id: msg.chat.id, message_id: countdownMsg.message_id }
                            );
                        } catch (error) {
                            console.error('Error updating countdown message:', error);
                        }
                        test.currentIndex++;
                        await bot.sendMessage(msg.chat.id, "Écrivez 'next' pour continuer.");
                    } else {
                        try {
                            await bot.editMessageText(
                                `Q/ ${currentWord}\nTemps restant: ${remaining.toFixed(1)}s`,
                                { chat_id: msg.chat.id, message_id: countdownMsg.message_id }
                            );
                        } catch (error) {
                            console.error('Error updating countdown message:', error);
                        }
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
            test.countdownInterval = null;
        }

        const currentWord = test.words[test.currentIndex];
        const endTime = now();
        const responseTime = (endTime - test.startTime) / 1000;
        const adjustedTime = responseTime - ((REACTION_TIME_MS + KEY_PRESS_TIME_MS) / 1000);

        console.log(`Processing response for word "${currentWord}" from user ${test.username}`);

        const accuracy = typingTest.calculateAccuracy(currentWord, msg.text);
        const wpm = typingTest.calculateWPM(msg.text, adjustedTime);

        let success = test.type.includes('speed') ?
            wpm >= 20 :
            accuracy >= 70;

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
    } finally {
        // Toujours libérer le verrou à la fin
        releaseLock(msg.chat.id);
    }
}

async function finishTest(bot, chatId) {
    const test = db.endTest(chatId);
    if (!test) {
        console.log('No active test found for chat', chatId);
        return;
    }

    console.log(`Finishing test for user ${test.username} (${chatId})`);
    const analysisMsg = await bot.sendMessage(chatId, "𝙰𝙽𝙰𝙻𝚈𝚂𝙴 𝙴𝙽 𝙲𝙾𝚄𝚁𝚂...");

    try {
        // Vérifier que nous avons des résultats
        if (!test.results || test.results.length === 0) {
            throw new Error('No test results found');
        }

        const avgWpm = test.results.reduce((sum, r) => sum + r.wpm, 0) / test.results.length;
        const avgAccuracy = test.results.reduce((sum, r) => sum + r.accuracy, 0) / test.results.length;
        const mode = test.type.includes('speed') ? 'speed' : 'precision';
        const rank = typingTest.getRankFromStats(avgWpm, avgAccuracy, mode);

        console.log('Calculated stats:', { avgWpm, avgAccuracy, mode, rank });

        // Calculer les meilleures performances
        const bestWpm = Math.max(...test.results.map(r => r.wpm));
        const bestAccuracy = Math.max(...test.results.map(r => r.accuracy));

        // Get username from Telegram
        const chat = await bot.getChat(chatId);
        const user = await bot.getChatMember(chatId, chatId);
        const username = user.user.first_name || chat.username || `User_${chatId}`;

        const stats = {
            wpm: Math.round(avgWpm),
            accuracy: Math.round(avgAccuracy),
            bestWpm: Math.round(bestWpm),
            bestAccuracy: Math.round(bestAccuracy),
            successCount: test.successCount || 0,
            totalTests: test.words.length,
            rank
        };

        // Sauvegarder les stats avec le username
        db.saveStats(chatId, username, test.type, stats);

        let statsMessage = `🏯 𝐒𝐇𝐈𝐑𝐎 𝐎𝐍𝐈 - 𝔾𝕌ℕ ℙ𝔸ℝ𝕂
Test ${test.type.includes('speed') ? 'de vitesse' : 'de précision'} terminé!

━━━━━━━━━━━━━━━━━━━━━━━━

📊 𝗥É𝗦𝗨𝗟𝗧𝗔𝗧𝗦 𝗙𝗜𝗡𝗔𝗨𝗫\n\n`;

        if (test.type.includes('speed')) {
            statsMessage += `⚡ Vitesse moyenne : ${stats.wpm} WPM
⚡ Meilleure vitesse : ${stats.bestWpm} WPM
🎯 Précision : ${stats.accuracy}%`;
        } else {
            statsMessage += `🎯 Précision moyenne : ${stats.accuracy}%
🎯 Meilleure précision : ${stats.bestAccuracy}%
⚡ Vitesse : ${stats.wpm} WPM`;
        }

        statsMessage += `\n✨ Réussites : ${stats.successCount}/${stats.totalTests}

🏆 Rang obtenu : ${stats.rank}

━━━━━━━━━━━━━━━━━━━━━━━━

Utilisez /training pour continuer l'entraînement`;


        // Envoyer les stats finales
        await bot.sendMessage(chatId, statsMessage);
        console.log(`Final stats sent successfully to ${username}`);

    } catch (error) {
        console.error('Error in finishTest:', error);
        await bot.sendMessage(chatId, "Une erreur est survenue lors de l'analyse des résultats.");
    }
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