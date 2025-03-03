const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('Initializing Gemini API...');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

let lastCallTime = 0;
const RATE_LIMIT_DELAY = 2000; // 2 secondes entre chaque appel

// Cache pour éviter les doublons
const generatedCache = new Set();
const MAX_CACHE_SIZE = 1000;

// Fonction pour nettoyer la réponse
function cleanResponse(text) {
    return text
        .replace(/["*]/g, '') // Supprime les guillemets et astérisques
        .replace(/^(voici|je propose|suggestion|exemple|une citation|une phrase|un mot|réponse).*?:/i, '') // Supprime les introductions
        .replace(/^\s*[-•]\s*/, '') // Supprime les puces au début
        .replace(/\s{2,}/g, ' ') // Normalise les espaces
        .trim();
}

async function generateText() {
    try {
        // Gestion du rate limiting
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime;
        if (timeSinceLastCall < RATE_LIMIT_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastCall));
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Liste étendue de prompts variés
        const prompts = [
            // Citations et punchlines d'artistes
            "Donne une punchline de Damso sans guillemets ni explications, juste la phrase.",
            "Donne une punchline de Booba sans guillemets ni explications, juste la phrase.",
            "Donne une punchline de Nekfeu sans guillemets ni explications, juste la phrase.",
            "Cite un passage marquant d'Oxmo Puccino sans guillemets ni explications.",

            // Poésie et littérature
            "Écris un haïku en français sans guillemets ni explications.",
            "Donne un court passage poétique de Baudelaire sans guillemets ni explications.",
            "Crée une métaphore originale sur la vie sans guillemets ni explications.",
            "Écris un vers libre sur la nature sans guillemets ni explications.",

            // Citations philosophiques et pensées
            "Donne une citation de philosophe sur l'existence sans guillemets ni explications.",
            "Exprime une pensée profonde sur le temps qui passe sans guillemets ni explications.",
            "Formule une réflexion sur la société moderne sans guillemets ni explications.",

            // Expressions créatives
            "Invente une expression surréaliste sans guillemets ni explications.",
            "Crée une phrase avec des mots composés originaux sans guillemets ni explications.",
            "Propose une maxime sur la créativité sans guillemets ni explications.",

            // Textes contemporains
            "Écris une ligne de slam contemporain sans guillemets ni explications.",
            "Compose une micro-fiction d'une phrase sans guillemets ni explications.",
            "Crée un aphorisme moderne sur la technologie sans guillemets ni explications.",

            // Variations culturelles
            "Donne une expression traditionnelle japonaise traduite en français sans explications.",
            "Propose un proverbe africain traduit en français sans guillemets ni explications.",
            "Adapte un dicton ancien en version moderne sans guillemets ni explications."
        ];

        const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        console.log(`Début de la génération avec le prompt: ${selectedPrompt}`);

        lastCallTime = Date.now();
        const result = await model.generateContent(selectedPrompt);
        const response = await result.response;
        const text = cleanResponse(response.text());

        // Vérification de la longueur et du cache
        if (text.length > 100) {
            console.log('Texte trop long, troncature...');
            const finalText = text.substring(0, 100);

            // Gestion du cache
            if (generatedCache.has(finalText)) {
                console.log('Texte déjà généré, nouvelle tentative...');
                return generateText(); // Récursion pour obtenir un nouveau texte
            }

            // Ajout au cache avec gestion de la taille
            if (generatedCache.size >= MAX_CACHE_SIZE) {
                const firstItem = generatedCache.values().next().value;
                generatedCache.delete(firstItem);
            }
            generatedCache.add(finalText);

            console.log(`Texte final: "${finalText}"`);
            return finalText;
        }

        // Gestion du cache pour les textes courts
        if (generatedCache.has(text)) {
            console.log('Texte déjà généré, nouvelle tentative...');
            return generateText(); // Récursion pour obtenir un nouveau texte
        }

        // Ajout au cache avec gestion de la taille
        if (generatedCache.size >= MAX_CACHE_SIZE) {
            const firstItem = generatedCache.values().next().value;
            generatedCache.delete(firstItem);
        }
        generatedCache.add(text);

        console.log(`Texte final: "${text}"`);
        return text;

    } catch (error) {
        console.error('Erreur lors de la génération du texte:', error);

        // En cas d'erreur, on essaie avec un prompt plus simple
        try {
            const simplePrompt = "Donne une phrase simple et originale.";
            const result = await model.generateContent(simplePrompt);
            const response = await result.response;
            return cleanResponse(response.text()).substring(0, 100);
        } catch (fallbackError) {
            console.error('Erreur lors de la génération du texte de fallback:', fallbackError);
            return null;
        }
    }
}

module.exports = {
    generateText
};