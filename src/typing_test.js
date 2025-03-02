const calculateWPM = (text, timeInSeconds) => {
    const words = text.length / 5; // Standard WPM calculation
    return Math.round((words * 60) / timeInSeconds);
};

const calculateAccuracy = (original, typed) => {
    if (!original || !typed) return 0;
    
    // Normalize strings for comparison
    const normalize = (str) => str.toLowerCase()
        .replace(/[àáâãäç]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9]/g, '');

    const orig = normalize(original);
    const type = normalize(typed);
    
    let correct = 0;
    const length = Math.max(orig.length, type.length);
    
    for (let i = 0; i < length; i++) {
        if (orig[i] === type[i]) correct++;
    }
    
    return (correct / length) * 100;
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
