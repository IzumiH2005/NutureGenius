const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('Initializing Gemini API...');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

let lastCallTime = 0;
const RATE_LIMIT_DELAY = 2000; // 2 secondes entre chaque appel

async function generateText() {
    try {
        // Vérifier le délai depuis le dernier appel
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime;
        if (timeSinceLastCall < RATE_LIMIT_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastCall));
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 

        const prompts = [
            "Donne uniquement une citation courte sans guillemets et sans explications.",
            "Donne uniquement un mot ou une expression poétique sans explications.",
            "Donne uniquement une phrase de rap français sans guillemets ni explications.",
            "Donne uniquement une expression originale sans guillemets ni explications.",
            "Donne uniquement une citation philosophique sans guillemets ni explications.",
            "Donne uniquement un nouveau mot composé sans explications.",
            "Donne uniquement une phrase courte impactante sans guillemets ni explications."
        ];

        const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];

        console.log(`Début de la génération avec le prompt: ${selectedPrompt}`);
        console.log('Appel de l\'API Gemini...');

        lastCallTime = Date.now();
        const result = await model.generateContent(selectedPrompt);
        const response = await result.response;
        const text = response.text()
            .replace(/["*]/g, '') // Supprime les guillemets et astérisques
            .replace(/^(voici|je propose|suggestion|exemple|une citation|une phrase|un mot).*?:/i, '') // Supprime les introductions
            .trim();

        console.log(`Texte généré avec succès: "${text.substring(0, 50)}..."`);

        // Ensure text isn't too long
        const finalText = text.length > 100 ? text.substring(0, 100) : text;
        console.log(`Texte final (après troncature si nécessaire): "${finalText}"`);

        return finalText;
    } catch (error) {
        console.error('Erreur lors de la génération du texte:', error);
        return null;
    }
}

module.exports = {
    generateText
};