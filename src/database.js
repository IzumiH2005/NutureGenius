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
            username // Stocker le username dans le test actif
        });
    },

    getActiveTest(userId) {
        return activeTests.get(userId);
    },

    updateTestResult(userId, result) {
        const test = activeTests.get(userId);
        if (test) {
            test.results.push(result);
            if (result.success) test.successCount++;
            if (result.errors) test.errors += result.errors;
        }
    },

    endTest(userId) {
        const test = activeTests.get(userId);
        activeTests.delete(userId);
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
        userData.stats[cleanTestType] = stats;

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