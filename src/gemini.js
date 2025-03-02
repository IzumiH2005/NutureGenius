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
            "Génère une citation inspirante ou un adage de ton choix.",
            "Propose un mot ou un groupe de mots évocateur et poétique.",
            "Donne une parole marquante de rap français (style Damso, Ninho, Booba ou Youssoupha).",
            "Crée une expression originale qui pourrait devenir un dicton.",
            "Cite une phrase d'un philosophe ou d'un auteur célèbre.",
            "Invente un mot composé ou une expression poétique.",
            "Donne un adjectif ou un groupe d'adjectifs évocateurs.",
            "Propose une phrase percutante qui pourrait venir d'une chanson de rap.",
            "Crée un néologisme (nouveau mot) avec sa signification.",
            "Extrait une citation existante de la littérature ou de la philosophie.",
            "Compose une phrase courte mais impactante.",
            "Génère un mot ou une expression qui évoque une émotion forte."
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