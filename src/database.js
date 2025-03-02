// In-memory database with session management
const users = new Map();
const activeTests = new Map();
const userSessions = new Map();

// Session management
function createUserSession(userId) {
    if (!userSessions.has(userId)) {
        userSessions.set(userId, {
            lastActivity: Date.now(),
            isLocked: false,
            currentTest: null
        });
        console.log(`[Session Manager] New session created for user ${userId}`);
        console.log(`[Session Manager] Active sessions: ${userSessions.size}`);
    }
    return userSessions.get(userId);
}

function updateSessionActivity(userId) {
    const session = userSessions.get(userId);
    if (session) {
        session.lastActivity = Date.now();
        console.log(`[Session Manager] Activity updated for user ${userId}`);
    }
}

function cleanupInactiveSessions() {
    const INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    let cleanedCount = 0;

    console.log(`[Session Manager] Starting cleanup of inactive sessions...`);
    console.log(`[Session Manager] Current active sessions: ${userSessions.size}`);

    for (const [userId, session] of userSessions.entries()) {
        if (now - session.lastActivity > INACTIVE_TIMEOUT) {
            console.log(`[Session Manager] Cleaning up inactive session for user ${userId} (inactive for ${Math.floor((now - session.lastActivity) / 1000)}s)`);
            if (session.currentTest?.countdownInterval) {
                clearInterval(session.currentTest.countdownInterval);
                console.log(`[Session Manager] Cleared countdown interval for user ${userId}`);
            }
            userSessions.delete(userId);
            activeTests.delete(userId);
            cleanedCount++;
        }
    }

    console.log(`[Session Manager] Cleanup completed. Removed ${cleanedCount} inactive sessions`);
    console.log(`[Session Manager] Remaining active sessions: ${userSessions.size}`);
}

// Run cleanup every 5 minutes
setInterval(cleanupInactiveSessions, 5 * 60 * 1000);

// Fonction pour nettoyer uniquement les tests terminés
function cleanupActiveTests() {
    const activeTestsArray = Array.from(activeTests.entries());
    activeTestsArray.forEach(([userId, test]) => {
        // Ne nettoie que les tests qui sont terminés
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

const db = {
    // User management
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

    // Active test management with session support
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

    // Stats management
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

    // Session management
    getUserSession(userId) {
        return userSessions.get(userId);
    },

    // Cleanup function now handles both completed tests and inactive sessions
    cleanup: () => {
        cleanupActiveTests();
        cleanupInactiveSessions();
    }
};

module.exports = db;