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

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Résultats:`);
    console.log(`• Textes uniques: ${generatedTexts.size}/${numberOfTests}`);
    console.log(`• Taux de succès: ${(generatedTexts.size/numberOfTests * 100).toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
}

testTextGeneration().catch(console.error);
