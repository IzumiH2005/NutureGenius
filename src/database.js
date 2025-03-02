// In-memory database
const users = new Map();
const activeTests = new Map();

const db = {
    // User management
    saveUser(userId, data) {
        const existingData = users.get(userId) || {};
        users.set(userId, { ...existingData, ...data });
        console.log(`User data saved for ${userId}:`, data);
    },

    getUser(userId) {
        const userData = users.get(userId);
        console.log(`Retrieving user data for ${userId}:`, userData);
        return userData;
    },

    getAllUsers() {
        return Array.from(users.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    },

    // Active test management
    startTest(userId, testType, words, username) {
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
            username // Stocker le username dans le test actif
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
        activeTests.delete(userId);
        console.log(`Ending test for user ${test?.username} (${userId})`, test);
        return test;
    },

    // Stats management
    saveStats(userId, username, testType, stats) {
        console.log(`Attempting to save stats for user ${username} (${userId})`);

        // Get existing user data or create new entry
        const userData = users.get(userId) || { username, stats: {} };

        // Ensure username is always updated
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
    }
};

module.exports = db;