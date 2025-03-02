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

        const contexts = [
            "dans un café parisien",
            "pendant une randonnée en montagne",
            "lors d'une soirée d'été",
            "dans un ancien temple japonais",
            "sur une plage déserte",
            "dans une bibliothèque silencieuse",
            "pendant un voyage en train",
            "dans un marché animé",
            "sous la pluie d'automne",
            "dans un jardin zen"
        ];

        const prompts = [
            "Générer une citation inspirante {context}",
            "Donner un proverbe philosophique {context}",
            "Écrire un mot ou groupe de mots évocateur {context}",
            "Donner une expression poétique {context}",
            "Générer une phrase descriptive {context}"
        ];

        const selectedContext = contexts[Math.floor(Math.random() * contexts.length)];
        const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)]
            .replace('{context}', selectedContext);

        console.log(`Generating text with prompt: ${selectedPrompt}`);

        lastCallTime = Date.now();
        const result = await model.generateContent(selectedPrompt);
        const response = await result.response;
        const text = response.text();

        console.log(`Generated text: ${text.substring(0, 50)}...`);

        // Ensure text isn't too long
        return text.length > 100 ? text.substring(0, 100) : text;
    } catch (error) {
        console.error('Gemini API error:', error);
        return null;
    }
}

module.exports = {
    generateText
};