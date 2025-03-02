# Bot Telegram d'Entraînement à la Frappe

Bot Telegram permettant aux utilisateurs de s'entraîner à la vitesse de frappe avec différents modes et fonctionnalités.

## Fonctionnalités

- Gestion multi-utilisateurs
- Mode précision
- Mode vitesse
- Système de suivi des performances
- Logs détaillés

## Installation

1. Cloner le repository
2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
- BOT_TOKEN : Token du bot Telegram

## Démarrage Local

```bash
npm start
```

## Déploiement sur Render

1. Créer un nouveau Web Service sur Render
2. Connecter votre repository GitHub
3. Configurer les variables d'environnement :
   - TELEGRAM_BOT_TOKEN : Votre token de bot Telegram
4. Render détectera automatiquement le projet Node.js et utilisera :
   - Build Command : `npm install`
   - Start Command : `node src/bot.js`

Le déploiement se fera automatiquement à chaque push sur la branche principale.

## Structure du Projet

```
├── src/
│   ├── bot.js           # Configuration du bot
│   ├── handlers/        # Gestionnaires des commandes
│   ├── services/        # Services (sessions, stats)
│   └── utils/          # Utilitaires
├── render.yaml         # Configuration Render
├── Procfile           # Configuration du processus
├── package.json
└── README.md
```

## Technologies

- Node.js
- node-telegram-bot-api
- Express (pour le statut)