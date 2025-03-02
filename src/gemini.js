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

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); 

        const prompts = [
            "Génère une citation inspirante dans un contexte de ton choix. Le contexte doit être évocateur et la citation doit être profonde et mémorable.",
            "Crée un proverbe philosophique original dans un contexte que tu choisis librement. Le proverbe doit être sage et réfléchi.",
            "Propose un mot ou groupe de mots évocateur dans un contexte que tu imagines. L'expression doit être poétique et significative.",
            "Compose un adage dans un contexte de ton choix. L'adage doit être porteur de sagesse et d'enseignement.",
            "Écris une phrase descriptive dans un environnement que tu sélectionnes. La description doit être vivante et immersive.",
            "Formule une expression poétique dans un cadre que tu détermines. L'expression doit être belle et touchante.",
            "Invente un dicton dans une situation de ton choix. Le dicton doit être mémorable et pertinent."
        ];

        const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];

        console.log(`Début de la génération avec le prompt: ${selectedPrompt}`);
        console.log('Appel de l\'API Gemini...');

        lastCallTime = Date.now();
        const result = await model.generateContent(selectedPrompt);
        const response = await result.response;
        const text = response.text();

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