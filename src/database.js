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
        console.log(`[Session Manager] Updated activity for user ${userId}, session:`, session);
    } else {
        console.log(`[Session Manager] No session found for user ${userId}, creating new one`);
        return createUserSession(userId);
    }
    return session;
}

// Database operations
const db = {
    getUserSession(userId) {
        let session = userSessions.get(userId);
        if (!session) {
            console.log(`[Session Manager] Creating new session for user ${userId}`);
            session = createUserSession(userId);
        }
        updateSessionActivity(userId);
        return session;
    },

    // Custom text management
    saveCustomText(userId, textName, content) {
        console.log(`[Custom Text] Attempting to save text for user ${userId}`);
        const textId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
        customTexts.set(textId, {
            name: textName,
            content,
            createdBy: userId,
            createdAt: Date.now()
        });
        console.log(`[Custom Text] Successfully saved text: ${textName} by user ${userId} with ID ${textId}`);
        return textId;
    },

    getCustomText(textId) {
        return customTexts.get(textId);
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
        updateSessionActivity(userId);
        const userData = users.get(userId);
        console.log(`Retrieving user data for ${userId}:`, userData);
        return userData;
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

        // Si un test existe déjà et n'est pas terminé, on le conserve
        const existingTest = activeTests.get(userId);
        if (existingTest && existingTest.currentIndex < existingTest.words.length) {
            console.log(`Preserving existing test for user ${userId}`);
            return;
        }

        // Nettoyer l'ancien test s'il existe
        if (existingTest) {
            if (existingTest.countdownInterval) {
                clearInterval(existingTest.countdownInterval);
            }
            activeTests.delete(userId);
        }

        // Sauvegarder le username immédiatement
        this.saveUser(userId, { username });

        console.log(`Starting ${testType} test for user ${username} (${userId})`);

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
            sessionId: Date.now() // Unique session identifier
        };

        activeTests.set(userId, newTest);
        session.currentTest = newTest;
    },

    getActiveTest(userId) {
        updateSessionActivity(userId);
        const session = userSessions.get(userId);
        if (!session) return null;

        return activeTests.get(userId);
    },

    updateTestResult(userId, result) {
        updateSessionActivity(userId);
        const test = activeTests.get(userId);
        if (test) {
            console.log(`Adding result for ${test.username}:`, result);
            test.results.push(result);
            if (result.success) {
                test.successCount++;
                console.log(`Success count increased to ${test.successCount}`);
            }
            if (result.errors) {
                test.errors += result.errors;
                console.log(`Errors count increased to ${test.errors}`);
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

        // Ne supprime le test que s'il est terminé
        if (test && test.currentIndex >= test.words.length) {
            activeTests.delete(userId);
            if (session) {
                session.currentTest = null;
            }
            console.log(`Test completed and removed for user ${test?.username} (${userId})`);
        }
        return test;
    },

    saveStats(userId, username, testType, stats) {
        updateSessionActivity(userId);
        console.log(`Saving stats for user ${username} (${userId})`);

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
        console.log(`Stats saved for user ${username} (${userId}):`, stats);
    },

    getStats(userId) {
        updateSessionActivity(userId);
        const userData = users.get(userId);
        console.log(`Retrieving stats for user ${userId}:`, userData);
        return userData ? userData.stats : null;
    },

    getStatsByUsername(username) {
        const user = this.getUserByUsername(username);
        console.log(`Getting stats for username ${username}:`, user?.stats);
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
        console.log(`Stats saved for text ${textId} by user ${userId}:`, stats);
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
            console.log(`Cleaned up completed test for user ${userId}`);
        }
    });
    console.log('Cleanup of completed tests finished');
}

module.exports = db;