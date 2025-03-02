// Constants for ranking thresholds
const RANKS = {
    'D-': { minWPM: 0, maxWPM: 10, minAccuracy: 0, maxAccuracy: 50 },
    'D': { minWPM: 10, maxWPM: 20, minAccuracy: 50, maxAccuracy: 60 },
    'D+': { minWPM: 20, maxWPM: 25, minAccuracy: 50, maxAccuracy: 60 },
    'C-': { minWPM: 25, maxWPM: 30, minAccuracy: 50, maxAccuracy: 70 },
    'C': { minWPM: 30, maxWPM: 35, minAccuracy: 50, maxAccuracy: 70 },
    'C+': { minWPM: 35, maxWPM: 40, minAccuracy: 50, maxAccuracy: 70 },
    'B-': { minWPM: 40, maxWPM: 45, minAccuracy: 70, maxAccuracy: 85 },
    'B': { minWPM: 45, maxWPM: 50, minAccuracy: 70, maxAccuracy: 85 },
    'B+': { minWPM: 50, maxWPM: 55, minAccuracy: 70, maxAccuracy: 85 },
    'A-': { minWPM: 55, maxWPM: 60, minAccuracy: 85, maxAccuracy: 95 },
    'A': { minWPM: 60, maxWPM: 65, minAccuracy: 85, maxAccuracy: 95 },
    'A+': { minWPM: 65, maxWPM: 70, minAccuracy: 85, maxAccuracy: 95 },
    'S-': { minWPM: 70, maxWPM: 75, minAccuracy: 95, maxAccuracy: 100 },
    'S': { minWPM: 75, maxWPM: 80, minAccuracy: 95, maxAccuracy: 100 },
    'S+': { minWPM: 80, maxWPM: 90, minAccuracy: 95, maxAccuracy: 100 },
    'SR': { minWPM: 90, maxWPM: 100, minAccuracy: 95, maxAccuracy: 100 },
    'SR+': { minWPM: 100, maxWPM: Infinity, minAccuracy: 95, maxAccuracy: 100 }
};

// Rank descriptions for detailed feedback
const RANK_DESCRIPTIONS = {
    'D-': "One finger no jutsu 🤡 - Il est temps de commencer l'entraînement!",
    'D': "Tu tapes mais on dirait t'es en prison - Continue l'entraînement!",
    'D+': "Tu commences à t'échauffer mais c'est toujours lent - Persévère!",
    'C-': "Écrit sans pression, mais ça galère sur les longs messages",
    'C': "Tu peux faire des pavés mais avec quelques pauses",
    'C+': "Main rapide mais tu relies encore à l'autocorrect pour être clean",
    'B-': "Tu commences à spammer sans réfléchir mais y'a encore des fautes",
    'B': "Tu peux taper des discussions de ouf sans trop de fautes",
    'B+': "Tu commences à avoir une gestuelle de hacker dans Mr Robot",
    'A-': "T'es rapide et propre mais tu check encore parfois le clavier",
    'A': "Tu peux écrire un couplet de Damso sans aucune faute en 10 secondes",
    'A+': "T'es un écrivain dans un corps de Shiro Oni, full vitesse, full précision",
    'S-': "Tes pouces sont branchés directement à ton cerveau",
    'S': "T'es dans le flow, zéro hésitation, aucune faute",
    'S+': "On t'appelle 'Shiro Oni' dans le quartier sans même te connaître",
    'SR': "Main gauche Google, main droite Apple, t'es le Yin & Yang du clavier",
    'SR+': "Tu peux taper un livre en entier juste pour répondre 'mdrr c vrai' 🔥🔥"
};

// Calculates final rank based on WPM and accuracy with weighted scoring
function calculateRank(wpm, accuracy) {
    // Speed weight: 40%, Accuracy weight: 60%
    const speedWeight = 0.4;
    const accuracyWeight = 0.6;
    
    // Find appropriate rank based on both metrics
    for (const [rank, thresholds] of Object.entries(RANKS)) {
        const speedScore = (wpm >= thresholds.minWPM && wpm < thresholds.maxWPM) ? 1 : 0;
        const accuracyScore = (accuracy >= thresholds.minAccuracy && accuracy <= thresholds.maxAccuracy) ? 1 : 0;
        
        const totalScore = (speedScore * speedWeight) + (accuracyScore * accuracyWeight);
        
        if (totalScore >= 0.6) { // Threshold for rank assignment
            return rank;
        }
    }
    
    return 'D-'; // Default rank if no other matches
}

// Generates detailed feedback based on performance
function generateFeedback(wpm, accuracy, rank) {
    let feedback = [];
    
    // Add rank description
    feedback.push(RANK_DESCRIPTIONS[rank]);
    
    // Add specific feedback based on metrics
    if (accuracy < 70) {
        feedback.push("👉 Concentrez-vous d'abord sur la précision avant la vitesse");
    }
    
    if (wpm < 30) {
        feedback.push("💪 Continuez l'entraînement pour améliorer votre vitesse");
    }
    
    if (accuracy >= 95 && wpm >= 75) {
        feedback.push("🏆 Félicitations! Vous avez atteint un niveau exceptionnel!");
        
        if (wpm >= 90) {
            feedback.push("⭐ Vous avez obtenu le badge Shiro Oni (白鬼)!");
        }
    }
    
    return feedback.join('\n');
}

// Calculates training time requirements based on current rank
function getTrainingTimeForRank(currentRank) {
    const rankValues = Object.keys(RANKS);
    const currentIndex = rankValues.indexOf(currentRank);
    
    // Base training time in minutes
    const baseTime = 20;
    
    // Increase training time for higher ranks
    return Math.round(baseTime * (1 + (currentIndex / rankValues.length)));
}

// Generates a complete performance analysis
function generateAnalysis(username, wpm, accuracy, rank) {
    return {
        username,
        metrics: {
            wpm,
            accuracy,
            rank
        },
        feedback: generateFeedback(wpm, accuracy, rank),
        recommendedTrainingTime: getTrainingTimeForRank(rank),
        badge: (accuracy >= 95 && wpm >= 75) ? "白鬼" : null
    };
}

module.exports = {
    calculateRank,
    generateFeedback,
    generateAnalysis,
    RANKS,
    RANK_DESCRIPTIONS
};
