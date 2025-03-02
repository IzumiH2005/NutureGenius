// In-memory database
const users = new Map();
const activeTests = new Map();

const db = {
    // User management
    saveUser(userId, data) {
        const existingData = users.get(userId) || {};
        users.set(userId, { ...existingData, ...data });
    },

    getUser(userId) {
        return users.get(userId);
    },

    getAllUsers() {
        return Array.from(users.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    },

    // Active test management
    startTest(userId, testType, words) {
        activeTests.set(userId, {
            type: testType,
            words,
            currentIndex: 0,
            startTime: Date.now(),
            results: [],
            errors: 0,
            successCount: 0
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
        const userData = users.get(userId) || { username, stats: {} };
        userData.stats[testType] = stats;
        users.set(userId, userData);
    },

    getStats(userId) {
        const userData = users.get(userId);
        return userData ? userData.stats : null;
    }
};

module.exports = db;
