// In-memory database
const users = new Map();
const activeTests = new Map();

// Fonction pour nettoyer uniquement les tests terminés
function cleanupActiveTests() {
    const activeTestsArray = Array.from(activeTests.entries());
    activeTestsArray.forEach(([userId, test]) => {
        // Ne nettoie que les tests qui sont terminés (currentIndex >= words.length)
        if (test.currentIndex >= test.words.length) {
            if (test.countdownInterval) {
                clearInterval(test.countdownInterval);
                test.countdownInterval = null;
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
        const existingData = users.get(userId) || {};
        // Ensure username is always updated if provided
        if (data.username) {
            existingData.username = data.username;
            console.log(`Updated username for ${userId} to ${data.username}`);
        }
        users.set(userId, { ...existingData, ...data });
        console.log(`User data saved for ${userId} (${data.username || 'Unknown'}):`, data);
    },

    getUser(userId) {
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

    // Active test management
    startTest(userId, testType, words, username) {
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

        activeTests.set(userId, {
            type: testType,
            words,
            currentIndex: 0,
            startTime: Date.now(),
            results: [],
            errors: 0,
            successCount: 0,
            totalTests: words.length,
            username,
            countdownInterval: null
        });
    },

    getActiveTest(userId) {
        return activeTests.get(userId);
    },

    updateTestResult(userId, result) {
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
        const test = activeTests.get(userId);
        if (test && test.countdownInterval) {
            clearInterval(test.countdownInterval);
            test.countdownInterval = null;
        }
        // Ne supprime le test que s'il est terminé
        if (test && test.currentIndex >= test.words.length) {
            activeTests.delete(userId);
            console.log(`Test completed and removed for user ${test?.username} (${userId})`);
        }
        return test;
    },

    // Stats management
    saveStats(userId, username, testType, stats) {
        console.log(`Saving stats for user ${username} (${userId})`);

        // Get existing user data or create new entry
        const userData = users.get(userId) || { stats: {} };

        // Always update username
        userData.username = username;

        // Remove '_training' suffix if present for stats storage
        const cleanTestType = testType.replace('_training', '');
        userData.stats = userData.stats || {};
        userData.stats[cleanTestType] = {
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            bestWpm: stats.bestWpm,
            bestAccuracy: stats.bestAccuracy,
            rank: stats.rank
        };

        // Save to database
        users.set(userId, userData);
        console.log(`Stats saved for user ${username} (${userId}):`, stats);
        console.log('Current user data:', userData);
    },

    getStats(userId) {
        const userData = users.get(userId);
        console.log(`Retrieving stats for user ${userId}:`, userData);
        return userData ? userData.stats : null;
    },

    getStatsByUsername(username) {
        const user = this.getUserByUsername(username);
        console.log(`Getting stats for username ${username}:`, user?.stats);
        return user ? user.stats : null;
    },

    // Cleanup function now only cleans completed tests
    cleanup: cleanupActiveTests
};

module.exports = db;