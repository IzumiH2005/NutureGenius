const calculateWPM = (text, timeInSeconds) => {
    const words = text.length / 5; // Standard WPM calculation
    return Math.round((words * 60) / timeInSeconds);
};

const calculateAccuracy = (original, typed) => {
    if (!original || !typed) return 0;

    console.log('Original:', original);
    console.log('Typed:', typed);

    // Fonction de normalisation simplifiée
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

    let correct = 0;
    const length = Math.max(orig.length, type.length);

    // Compter les caractères corrects
    for (let i = 0; i < length; i++) {
        if (orig[i] === type[i]) {
            correct++;
        }
    }

    // Calculer la précision
    const accuracy = Math.round((correct / length) * 100);
    console.log('Caractères corrects:', correct);
    console.log('Longueur totale:', length);
    console.log('Précision calculée:', accuracy);

    return accuracy;
};

const getRankFromStats = (wpm, accuracy) => {
    // Speed weight: 40%, Accuracy weight: 60%
    const speedScore = wpm;
    const accuracyScore = accuracy;
    const totalScore = (speedScore * 0.4) + (accuracyScore * 0.6);

    if (accuracy < 50) return 'D-';
    if (wpm < 20) return 'D';
    if (wpm < 25) return 'D+';
    if (wpm < 30) return 'C-';
    if (wpm < 35) return 'C';
    if (wpm < 40) return 'C+';
    if (wpm < 45) return 'B-';
    if (wpm < 50) return 'B';
    if (wpm < 55) return 'B+';
    if (wpm < 60) return 'A-';
    if (wpm < 65) return 'A';
    if (wpm < 70) return 'A+';
    if (wpm < 75) return 'S-';
    if (wpm < 80) return 'S';
    if (wpm < 90) return 'S+';
    if (wpm < 100) return 'SR';
    return 'SR+';
};

module.exports = {
    calculateWPM,
    calculateAccuracy,
    getRankFromStats
};