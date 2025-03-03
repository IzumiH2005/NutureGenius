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

// Métriques pour le monitoring
const metrics = {
    totalCalls: 0,
    successfulCalls: 0,
    cacheHits: 0,
    errors: 0,
    averageResponseTime: 0,
    promptDistribution: {}
};

// Fonction pour nettoyer la réponse
function cleanResponse(text) {
    return text
        .replace(/["*]/g, '') // Supprime les guillemets et astérisques
        .replace(/^(voici|je propose|suggestion|exemple|une citation|une phrase|un mot|réponse|citation de|proverbe|adage).*?:/i, '') // Supprime les introductions
        .replace(/^\s*[-•]\s*/, '') // Supprime les puces au début
        .replace(/\s{2,}/g, ' ') // Normalise les espaces
        .replace(/\(.*?\)/g, '') // Supprime les parenthèses et leur contenu
        .replace(/\s*[-—]\s*[\w\s]+$/, '') // Supprime l'attribution à la fin (ex: "- Nietzsche")
        .replace(/\.{2,}/g, '.') // Remplace les points de suspension par un point
        .replace(/\s*\[[^\]]*\]/g, '') // Supprime les annotations entre crochets
        .trim();
}

async function generateText() {
    try {
        metrics.totalCalls++;
        const startTime = Date.now();

        // Gestion du rate limiting
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime;
        if (timeSinceLastCall < RATE_LIMIT_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastCall));
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Liste étendue de prompts variés
        const prompts = [
            // Punchlines d'artistes rap/hip-hop français
            "Donne une punchline de Damso sur le succès sans guillemets ni explications.",
            "Donne une punchline de Damso sur l'argent sans guillemets ni explications.",
            "Cite un passage de Damso sur la société sans guillemets ni explications.",
            "Donne une punchline de Booba sur la réussite sans guillemets ni explications.",
            "Cite un passage de Booba sur la rue sans guillemets ni explications.",
            "Donne une punchline de Booba sur le rap game sans guillemets ni explications.",
            "Cite un passage de Ninho sur l'ambition sans guillemets ni explications.",
            "Donne une punchline de Ninho sur la famille sans guillemets ni explications.",
            "Cite un passage de Ninho sur le succès sans guillemets ni explications.",
            "Donne une punchline de Gims sur la vie sans guillemets ni explications.",
            "Cite un passage de Gims sur la motivation sans guillemets ni explications.",
            "Donne une punchline de Gims sur le parcours sans guillemets ni explications.",
            "Cite un passage de Dadju sur l'amour sans guillemets ni explications.",
            "Donne une punchline de Dadju sur les relations sans guillemets ni explications.",
            "Cite un passage de SCH sur la vie de rue sans guillemets ni explications.",
            "Donne une punchline de Freeze Corleone sur la société sans guillemets ni explications.",
            "Cite un passage de Laylow sur la solitude sans guillemets ni explications.",

            // Citations philosophiques
            "Cite une réflexion de Nietzsche sur la volonté sans guillemets ni explications.",
            "Donne une citation de Camus sur l'absurde sans guillemets ni explications.",
            "Cite une pensée de Sartre sur la liberté sans guillemets ni explications.",
            "Donne une réflexion de Descartes sur la raison sans guillemets ni explications.",
            "Cite une pensée de Hegel sur la conscience sans guillemets ni explications.",
            "Donne une citation de Kant sur la morale sans guillemets ni explications.",
            "Cite une réflexion de Schopenhauer sur la volonté sans guillemets ni explications.",
            "Donne une pensée de Pascal sur l'existence sans guillemets ni explications.",
            "Cite une réflexion de Spinoza sur les émotions sans guillemets ni explications.",
            "Donne une citation de Kierkegaard sur l'angoisse sans guillemets ni explications.",

            // Proverbes et adages
            "Donne un proverbe chinois sur la sagesse sans guillemets ni explications.",
            "Cite un proverbe japonais sur le temps sans guillemets ni explications.",
            "Donne un adage latin sur le destin sans guillemets ni explications.",
            "Cite un proverbe africain sur la communauté sans guillemets ni explications.",
            "Donne un dicton traditionnel sur la patience sans guillemets ni explications.",
            "Cite une maxime sur la vertu sans guillemets ni explications.",
            "Donne un adage populaire sur le travail sans guillemets ni explications.",
            "Cite un proverbe sur la persévérance sans guillemets ni explications.",

            // Extraits spécifiques
            "Cite un extrait de 'Macarena' de Damso sans guillemets ni explications.",
            "Cite un extrait de 'DLB' de Booba sans guillemets ni explications.",
            "Cite un extrait de 'Jefe' de Ninho sans guillemets ni explications.",
            "Cite un extrait de 'Bella' de Gims sans guillemets ni explications.",
            "Cite un extrait de 'Reine' de Dadju sans guillemets ni explications.",

            // Citations et philosophie urbaine
            "Donne une réflexion sur la vie de rue sans guillemets ni explications.",
            "Exprime une pensée sur le succès et l'argent sans guillemets ni explications.",
            "Formule une réflexion sur la loyauté sans guillemets ni explications.",
            "Donne une citation sur l'ambition et le travail sans guillemets ni explications.",

            // Expressions et métaphores urbaines
            "Crée une métaphore sur la ville sans guillemets ni explications.",
            "Invente une expression sur la réussite sans guillemets ni explications.",
            "Compose une phrase sur la force mentale sans guillemets ni explications.",
            "Crée une image poétique sur la rue sans guillemets ni explications.",

            // Variations culturelles
            "Adapte un proverbe africain en version urbaine sans guillemets ni explications.",
            "Transforme une sagesse traditionnelle en langage de rue sans guillemets ni explications.",
            "Modernise un dicton populaire avec une touche rap sans guillemets ni explications."
        ];

        const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        console.log(`Début de la génération avec le prompt: ${selectedPrompt}`);

        // Mise à jour des métriques de distribution des prompts
        const promptCategory = selectedPrompt.split(' ')[0];
        metrics.promptDistribution[promptCategory] = (metrics.promptDistribution[promptCategory] || 0) + 1;

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
                metrics.cacheHits++;
                return generateText(); // Récursion pour obtenir un nouveau texte
            }

            // Ajout au cache avec gestion de la taille
            if (generatedCache.size >= MAX_CACHE_SIZE) {
                const firstItem = generatedCache.values().next().value;
                generatedCache.delete(firstItem);
            }
            generatedCache.add(finalText);

            console.log(`Texte final: "${finalText}"`);

            // Mise à jour des métriques
            metrics.successfulCalls++;
            metrics.averageResponseTime = ((metrics.averageResponseTime * (metrics.successfulCalls - 1)) + (Date.now() - startTime)) / metrics.successfulCalls;

            return finalText;
        }

        // Gestion du cache pour les textes courts
        if (generatedCache.has(text)) {
            console.log('Texte déjà généré, nouvelle tentative...');
            metrics.cacheHits++;
            return generateText(); // Récursion pour obtenir un nouveau texte
        }

        // Ajout au cache avec gestion de la taille
        if (generatedCache.size >= MAX_CACHE_SIZE) {
            const firstItem = generatedCache.values().next().value;
            generatedCache.delete(firstItem);
        }
        generatedCache.add(text);

        console.log(`Texte final: "${text}"`);

        // Mise à jour des métriques
        metrics.successfulCalls++;
        metrics.averageResponseTime = ((metrics.averageResponseTime * (metrics.successfulCalls - 1)) + (Date.now() - startTime)) / metrics.successfulCalls;

        return text;

    } catch (error) {
        console.error('Erreur lors de la génération du texte:', error);
        metrics.errors++;

        // Liste de prompts de fallback diversifiés
        const fallbackPrompts = [
            "Donne une phrase simple et originale.",
            "Exprime une pensée courte et impactante.",
            "Crée une expression inspirante en une ligne.",
            "Formule une réflexion concise sur la vie.",
            "Compose une phrase motivante."
        ];

        // En cas d'erreur, on essaie avec un prompt de fallback aléatoire
        try {
            const fallbackPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
            console.log(`Tentative de fallback avec le prompt: ${fallbackPrompt}`);
            const result = await model.generateContent(fallbackPrompt);
            const response = await result.response;
            return cleanResponse(response.text()).substring(0, 100);
        } catch (fallbackError) {
            console.error('Erreur lors de la génération du texte de fallback:', fallbackError);
            return null;
        }
    }
}

// Fonction pour obtenir les métriques actuelles
function getMetrics() {
    return {
        ...metrics,
        cacheSize: generatedCache.size,
        successRate: (metrics.successfulCalls / metrics.totalCalls * 100).toFixed(2) + '%',
        averageResponseTime: Math.round(metrics.averageResponseTime) + 'ms'
    };
}

module.exports = {
    generateText,
    getMetrics
};