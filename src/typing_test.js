const calculateWPM = (text, timeInSeconds) => {
    const words = text.length / 5; // Standard WPM calculation
    return Math.round((words * 60) / timeInSeconds);
};

const calculateAccuracy = (original, typed) => {
    if (!original || !typed) return 0;

    console.log('Original:', original);
    console.log('Typed:', typed);

    // Fonction de normalisation améliorée
    const normalize = (str) => {
        // Conversion en minuscules
        str = str.toLowerCase();
        // Remplacer les accents
        str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Supprimer les caractères spéciaux sauf les caractères japonais
        str = str.replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
        return str;
    };

    const orig = normalize(original);
    const type = normalize(typed);

    console.log('Normalisé original:', orig);
    console.log('Normalisé tapé:', type);

    // Séparer en mots
    const origWords = orig.split(' ');
    const typeWords = type.split(' ');

    let totalScore = 0;
    let maxPossibleScore = 0;

    // Analyser chaque mot avec position
    for (let i = 0; i < Math.max(origWords.length, typeWords.length); i++) {
        const origWord = origWords[i] || '';
        const typeWord = typeWords[i] || '';
        const wordLength = Math.max(origWord.length, typeWord.length);

        // Score maximum possible pour ce mot
        maxPossibleScore += wordLength;

        // Score de base pour les caractères corrects
        let wordScore = 0;
        const minLength = Math.min(origWord.length, typeWord.length);

        // Vérifier les caractères corrects
        for (let j = 0; j < minLength; j++) {
            if (origWord[j] === typeWord[j]) {
                wordScore += 1; // 1 point pour chaque caractère correct
            }
        }

        // Pénalité pour différence de longueur
        const lengthDiff = Math.abs(origWord.length - typeWord.length);
        wordScore = Math.max(0, wordScore - lengthDiff);

        totalScore += wordScore;
    }

    // Calculer le pourcentage final
    let accuracy = Math.round((totalScore / maxPossibleScore) * 100);

    // Limiter entre 0 et 100
    accuracy = Math.min(100, Math.max(0, accuracy));

    console.log('Score total:', totalScore);
    console.log('Score maximum possible:', maxPossibleScore);
    console.log('Précision calculée:', accuracy);

    return accuracy;
};

const getRankFromStats = (wpm, accuracy, mode = 'precision') => {
    if (mode === 'speed') {
        if (wpm <= 20) return 'D';
        if (wpm <= 30) return 'C';
        if (wpm <= 35) return 'C+';
        if (wpm <= 40) return 'B-';
        if (wpm <= 45) return 'B';
        if (wpm <= 50) return 'B+';
        if (wpm <= 55) return 'A-';
        if (wpm <= 60) return 'A';
        if (wpm <= 65) return 'A+';
        if (wpm <= 70) return 'S';
        if (wpm <= 75) return 'S+';
        return 'SR';
    } else {
        if (accuracy < 50) return 'D';
        if (accuracy < 70 || wpm < 20) return 'C';
        if (accuracy < 80 || wpm < 30) return 'B';
        if (accuracy < 90 || wpm < 40) return 'A';
        if (accuracy < 95 || wpm < 50) return 'S';
        return 'SR';
    }
};

module.exports = {
    calculateWPM,
    calculateAccuracy,
    getRankFromStats
};