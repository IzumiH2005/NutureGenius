// In-memory database
const users = new Map();
const activeTests = new Map();

// Fonction pour nettoyer les tests actifs
function cleanupActiveTests() {
    activeTests.clear();
    console.log('Active tests cleared');
}

const db = {
    // User management
    saveUser(userId, data) {
        const existingData = users.get(userId) || {};
        // Ensure username is always updated if provided
        if (data.username) {
            existingData.username = data.username;
        }
        users.set(userId, { ...existingData, ...data });
        console.log(`User data saved for ${userId} (${data.username || 'Unknown'}):`, data);
    },

    getUser(userId) {
        const userData = users.get(userId);
        console.log(`Retrieving user data for ${userId}:`, userData);
        return userData;
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
        // Nettoyer tout test existant pour cet utilisateur
        if (activeTests.has(userId)) {
            console.log(`Cleaning up existing test for user ${userId}`);
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
            username
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

    // Cleanup function
    cleanup: cleanupActiveTests
};

module.exports = db;