// In-memory database with session management
const users = new Map();
const activeTests = new Map();
const userSessions = new Map();
const customTexts = new Map(); // Stockage des textes personnalisés
const customTextStats = new Map(); // Stockage des stats par texte

// Session management
function createUserSession(userId) {
    if (!userSessions.has(userId)) {
        const session = {
            lastActivity: Date.now(),
            isLocked: false,
            currentTest: null,
            customTextState: null,
            pendingCustomText: null
        };
        userSessions.set(userId, session);
        console.log(`[Session Manager] Created new session for user ${userId}:`, session);
    }
    return userSessions.get(userId);
}

function updateSessionActivity(userId) {
    const session = userSessions.get(userId);
    if (session) {
        session.lastActivity = Date.now();
        console.log(`[Session Manager] Updated activity for user ${userId}`);
    } else {
        console.log(`[Session Manager] No session found for user ${userId}, creating new one`);
        return createUserSession(userId);
    }
    return session;
}

// Fonction utilitaire pour découper le texte en phrases
function splitTextIntoSentences(text) {
    return text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

// Fonction utilitaire pour découper une phrase en mots
function splitSentenceIntoWords(sentence) {
    return sentence
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);
}

// Database operations
const db = {
    getUserSession(userId) {
        let session = userSessions.get(userId);
        if (!session) {
            session = createUserSession(userId);
        }
        updateSessionActivity(userId);
        return session;
    },

    // Custom text management
    saveCustomText(userId, textName, content) {
        console.log(`[Custom Text] Saving text "${textName}" for user ${userId}`);

        // Découper le texte en phrases
        const sentences = splitTextIntoSentences(content);
        console.log(`[Custom Text] Split into ${sentences.length} sentences`);

        // Pour chaque phrase, découper en mots
        const processedContent = sentences.map(sentence => ({
            sentence: sentence,
            words: splitSentenceIntoWords(sentence)
        }));

        const textId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const textData = {
            id: textId,
            name: textName,
            content: processedContent,
            rawContent: content,
            createdBy: userId,
            createdAt: Date.now()
        };

        customTexts.set(textId, textData);
        console.log(`[Custom Text] Saved text with ID ${textId}:`, {
            name: textName,
            sentenceCount: processedContent.length,
            totalWords: processedContent.reduce((sum, s) => sum + s.words.length, 0)
        });

        return textId;
    },

    getCustomText(textId) {
        console.log(`[Custom Text] Retrieving text ${textId}`);
        const text = customTexts.get(textId);
        if (!text) {
            console.log(`[Custom Text] Text ${textId} not found`);
            return null;
        }
        return text;
    },

    getAllCustomTexts() {
        return Array.from(customTexts.entries()).map(([id, text]) => ({
            id,
            name: text.name,
            createdBy: text.createdBy,
            createdAt: text.createdAt
        }));
    },

    getUserCustomTexts(userId) {
        return Array.from(customTexts.entries())
            .filter(([, text]) => text.createdBy === userId)
            .map(([id, text]) => ({
                id,
                name: text.name,
                createdAt: text.createdAt
            }));
    },
    saveUser(userId, data) {
        createUserSession(userId);
        updateSessionActivity(userId);

        const existingData = users.get(userId) || {};
        if (data.username) {
            existingData.username = data.username;
            console.log(`Updated username for ${userId} to ${data.username}`);
        }
        users.set(userId, { ...existingData, ...data });
        console.log(`User data saved for ${userId} (${data.username || 'Unknown'}):`, data);
    },

    getUser(userId) {
        return users.get(userId);
    },

    getUserByUsername(username) {
        const foundUser = Array.from(users.values()).find(user => user.username === username);
        console.log(`Looking for user with username ${username}:`, foundUser);
        return foundUser;
    },

    getAllUsers() {
        return Array.from(users.entries()).map(([id, data]) => ({
            id,
            username: data.username || `User_${id}`,
            ...data
        }));
    },

    startTest(userId, testType, words, username) {
        const session = createUserSession(userId);
        updateSessionActivity(userId);

        console.log(`[Test Manager] Starting ${testType} test for user ${username} (${userId}) with ${words.length} words`);

        const newTest = {
            type: testType,
            words,
            currentIndex: 0,
            startTime: Date.now(),
            results: [],
            errors: 0,
            successCount: 0,
            totalTests: words.length,
            username,
            countdownInterval: null,
            sessionId: Date.now()
        };

        activeTests.set(userId, newTest);
        session.currentTest = newTest;

        console.log(`[Test Manager] Test created:`, {
            type: testType,
            wordCount: words.length,
            username
        });
    },

    getActiveTest(userId) {
        updateSessionActivity(userId);
        const test = activeTests.get(userId);
        if (test) {
            console.log(`[Test Manager] Retrieved active test for user ${userId}:`, {
                type: test.type,
                progress: `${test.currentIndex}/${test.totalTests}`
            });
        }
        return test;
    },

    updateTestResult(userId, result) {
        updateSessionActivity(userId);
        const test = activeTests.get(userId);
        if (test) {
            console.log(`[Test Manager] Adding result for ${test.username}:`, result);
            test.results.push(result);
            if (result.success) {
                test.successCount++;
            }
            if (result.errors) {
                test.errors += result.errors;
            }
        }
    },

    endTest(userId) {
        updateSessionActivity(userId);
        const test = activeTests.get(userId);
        const session = userSessions.get(userId);

        if (test && test.countdownInterval) {
            clearInterval(test.countdownInterval);
            test.countdownInterval = null;
        }

        if (test && test.currentIndex >= test.words.length) {
            activeTests.delete(userId);
            if (session) {
                session.currentTest = null;
            }
            console.log(`[Test Manager] Test completed for user ${test?.username} (${userId})`);
        }
        return test;
    },

    saveStats(userId, username, testType, stats) {
        updateSessionActivity(userId);
        console.log(`[Stats Manager] Saving stats for user ${username} (${userId})`);

        const userData = users.get(userId) || { stats: {} };
        userData.username = username;

        const cleanTestType = testType.replace('_training', '');
        userData.stats = userData.stats || {};
        userData.stats[cleanTestType] = {
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            bestWpm: stats.bestWpm,
            bestAccuracy: stats.bestAccuracy,
            rank: stats.rank
        };

        users.set(userId, userData);
        console.log(`[Stats Manager] Stats saved:`, stats);
    },

    getStats(userId) {
        updateSessionActivity(userId);
        const userData = users.get(userId);
        console.log(`[Stats Manager] Retrieved stats for user ${userId}:`, userData?.stats);
        return userData ? userData.stats : null;
    },

    getStatsByUsername(username) {
        const user = this.getUserByUsername(username);
        console.log(`[Stats Manager] Retrieved stats for username ${username}:`, user?.stats);
        return user ? user.stats : null;
    },

    saveCustomTextStats(textId, userId, stats) {
        if (!customTextStats.has(textId)) {
            customTextStats.set(textId, new Map());
        }
        const textStats = customTextStats.get(textId);
        textStats.set(userId, {
            ...stats,
            timestamp: Date.now()
        });
        console.log(`[Custom Text Stats] Saved stats for text ${textId} by user ${userId}:`, stats);
    },

    getCustomTextStats(textId) {
        const textStats = customTextStats.get(textId);
        if (!textStats) return [];

        return Array.from(textStats.entries()).map(([userId, stats]) => {
            const user = this.getUser(userId);
            return {
                username: user?.username || `User_${userId}`,
                ...stats
            };
        }).sort((a, b) => b.wpm - a.wpm);
    },

    getGlobalLeaderboard() {
        const userStats = new Map();

        users.forEach((userData, userId) => {
            if (userData.stats) {
                let bestWpm = 0;
                let bestAccuracy = 0;

                if (userData.stats.speed) {
                    bestWpm = Math.max(bestWpm, userData.stats.speed.bestWpm || 0);
                    bestAccuracy = Math.max(bestAccuracy, userData.stats.speed.bestAccuracy || 0);
                }
                if (userData.stats.precision) {
                    bestWpm = Math.max(bestWpm, userData.stats.precision.wpm || 0);
                    bestAccuracy = Math.max(bestAccuracy, userData.stats.precision.bestAccuracy || 0);
                }

                userStats.set(userId, {
                    username: userData.username || `User_${userId}`,
                    bestWpm,
                    bestAccuracy
                });
            }
        });

        return Array.from(userStats.values())
            .sort((a, b) => b.bestWpm - a.bestWpm);
    },

    cleanup: () => {
        cleanupActiveTests();
    }
};

// Function to cleanup completed tests only
function cleanupActiveTests() {
    const activeTestsArray = Array.from(activeTests.entries());
    activeTestsArray.forEach(([userId, test]) => {
        if (test.currentIndex >= test.words.length) {
            if (test.countdownInterval) {
                clearInterval(test.countdownInterval);
                test.countdownInterval = null;
            }

            const session = userSessions.get(userId);
            if (session) {
                session.currentTest = null;
            }

            activeTests.delete(userId);
            console.log(`[Test Manager] Cleaned up completed test for user ${userId}`);
        }
    });
    console.log('[Test Manager] Cleanup of completed tests finished');
}

module.exports = db;