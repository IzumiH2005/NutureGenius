// Constants for ranking thresholds
const RANKS = {
    // Mode vitesse
    SPEED: {
        'D': { minWPM: 0, maxWPM: 20 },
        'C': { minWPM: 21, maxWPM: 30 },
        'C+': { minWPM: 31, maxWPM: 35 },
        'B-': { minWPM: 36, maxWPM: 40 },
        'B': { minWPM: 41, maxWPM: 45 },
        'B+': { minWPM: 46, maxWPM: 50 },
        'A-': { minWPM: 51, maxWPM: 55 },
        'A': { minWPM: 56, maxWPM: 60 },
        'A+': { minWPM: 61, maxWPM: 65 },
        'S': { minWPM: 66, maxWPM: 70 },
        'S+': { minWPM: 71, maxWPM: 75 },
        'SR': { minWPM: 76, maxWPM: Infinity }
    },
    // Mode précision
    PRECISION: {
        'D': { minWPM: 0, maxWPM: 20, minAccuracy: 0, maxAccuracy: 50 },
        'C': { minWPM: 20, maxWPM: 30, minAccuracy: 50, maxAccuracy: 70 },
        'B': { minWPM: 30, maxWPM: 40, minAccuracy: 70, maxAccuracy: 80 },
        'A': { minWPM: 40, maxWPM: 50, minAccuracy: 80, maxAccuracy: 90 },
        'S': { minWPM: 50, maxWPM: Infinity, minAccuracy: 90, maxAccuracy: 95 },
        'SR': { minWPM: 50, maxWPM: Infinity, minAccuracy: 95, maxAccuracy: 100 }
    }
};

// Rank descriptions for detailed feedback
const RANK_DESCRIPTIONS = {
    // Mode vitesse
    SPEED: {
        'D': "Vitesse des débutants ou des personnes qui écrivent rarement sur smartphone",
        'C': "Vitesse lente, la plupart des gens écrivent à ce rythme sans s'en rendre compte",
        'C+': "Vitesse moyenne classique, correspondant à la majorité des utilisateurs réguliers",
        'B-': "Au-dessus de la moyenne, ça montre que tu es habitué à écrire vite mais sans forcer",
        'B': "Bon niveau, tu commences à être rapide sans avoir besoin de te concentrer",
        'B+': "Vitesse rapide, ceux qui tapent souvent des pavés sur WhatsApp ou Telegram sont ici",
        'A-': "Très rapide, tu dépasses déjà 99% des gens sans vraiment tryhard",
        'A': "Excellente vitesse, t'es en mode sniper automatique avec les deux pouces",
        'A+': "L'élite, impossible de te clasher en messages vocaux",
        'S': "Monstre de frappe, comme si tu écrivais directement depuis ton cerveau",
        'S+': "Humain boosté, niveau auteur ou écrivain mobile",
        'SR': "Dieu Android. Très probablement Gun Park Shiro Oni lui-même, ou une IA déguisée en humain"
    },
    // Mode précision
    PRECISION: {
        'D': "Précision insuffisante, concentrez-vous sur chaque caractère",
        'C': "Précision basique, continuez à vous entraîner",
        'B': "Bonne précision, la vitesse commence à suivre",
        'A': "Excellent équilibre entre vitesse et précision",
        'S': "Maîtrise exceptionnelle, proche de la perfection",
        'SR': "Perfection absolue, vitesse et précision maximales"
    }
};

// Calculates final rank based on mode
function calculateRank(wpm, accuracy, mode = 'precision') {
    const rankSystem = mode === 'speed' ? RANKS.SPEED : RANKS.PRECISION;

    for (const [rank, thresholds] of Object.entries(rankSystem)) {
        if (mode === 'speed') {
            if (wpm >= thresholds.minWPM && wpm < thresholds.maxWPM) {
                return rank;
            }
        } else {
            if (wpm >= thresholds.minWPM && accuracy >= thresholds.minAccuracy && accuracy < thresholds.maxAccuracy) {
                return rank;
            }
        }
    }
    return mode === 'speed' ? 'D' : 'SR';
}

// Generates detailed feedback based on performance
function generateFeedback(wpm, accuracy, rank, mode = 'precision') {
    let feedback = [];

    // Add rank description based on mode
    feedback.push(mode === 'speed' ? RANK_DESCRIPTIONS.SPEED[rank] : RANK_DESCRIPTIONS.PRECISION[rank]);

    if (mode === 'speed') {
        if (wpm < 30) {
            feedback.push("💪 Continuez l'entraînement pour améliorer votre vitesse");
        }
        if (wpm >= 76) {
            feedback.push("⭐ Vous avez obtenu le badge Shiro Oni (白鬼)!");
        }
    } else {
        if (accuracy < 70) {
            feedback.push("💪 Concentrez-vous sur la précision avant la vitesse");
        }
        if (accuracy >= 95 && wpm >= 50) {
            feedback.push("⭐ Vous avez obtenu le badge Shiro Oni (白鬼)!");
        }
    }

    return feedback.join('\n');
}

// Generates a complete performance analysis
function generateAnalysis(username, wpm, accuracy, rank, mode = 'precision') {
    return {
        username,
        metrics: {
            wpm,
            accuracy,
            rank
        },
        feedback: generateFeedback(wpm, accuracy, rank, mode),
        badge: mode === 'speed' ? 
            (wpm >= 76 ? "白鬼" : null) : 
            (accuracy >= 95 && wpm >= 50 ? "白鬼" : null)
    };
}

module.exports = {
    calculateRank,
    generateFeedback,
    generateAnalysis,
    RANKS,
    RANK_DESCRIPTIONS
};