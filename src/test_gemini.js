const gemini = require('./gemini');

async function testTextGeneration() {
    console.log('🧪 Test de génération de textes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const generatedTexts = new Set();
    const numberOfTests = 10;

    console.log(`Génération de ${numberOfTests} textes...\n`);

    for (let i = 0; i < numberOfTests; i++) {
        try {
            console.log(`Test #${i + 1}:`);
            const text = await gemini.generateText();

            if (text) {
                console.log(`✅ Texte généré: "${text}"`);
                if (generatedTexts.has(text)) {
                    console.log('⚠️ ATTENTION: Doublon détecté!\n');
                } else {
                    generatedTexts.add(text);
                    console.log('✨ Texte unique confirmé\n');
                }
            } else {
                console.log('❌ Échec de la génération\n');
            }

            // Petit délai entre les tests pour respecter le rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('❌ Erreur:', error.message, '\n');
        }
    }

    // Affichage des métriques
    const metrics = gemini.getMetrics();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Résultats des tests:');
    console.log(`• Textes uniques: ${generatedTexts.size}/${numberOfTests}`);
    console.log(`• Taux de succès: ${metrics.successRate}`);
    console.log(`• Temps de réponse moyen: ${metrics.averageResponseTime}`);
    console.log(`• Cache hits: ${metrics.cacheHits}`);
    console.log(`• Erreurs: ${metrics.errors}`);
    console.log('\n📈 Distribution des prompts:');
    for (const [category, count] of Object.entries(metrics.promptDistribution)) {
        const percentage = (count / metrics.totalCalls * 100).toFixed(1);
        console.log(`• ${category}: ${percentage}%`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function testStressGeneration() {
    console.log('\n🔥 Test de stress - Génération simultanée');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const numberOfParallelTests = 5;
    console.log(`Lancement de ${numberOfParallelTests} générations simultanées...\n`);

    try {
        const promises = Array(numberOfParallelTests).fill().map(() => gemini.generateText());
        const results = await Promise.all(promises);

        const successCount = results.filter(Boolean).length;
        console.log(`✅ ${successCount}/${numberOfParallelTests} générations réussies\n`);
    } catch (error) {
        console.error('❌ Erreur lors du test de stress:', error.message, '\n');
    }
}

// Exécution des tests
async function runAllTests() {
    await testTextGeneration();
    await testStressGeneration();
}

runAllTests().catch(console.error);