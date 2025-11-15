import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands } from './utils/commandLoader';
import { loadEvents } from './utils/eventLoader';
import { DatabaseManager } from './database/databaseManager';
import { LogManager } from './managers/logManager';
import { HttpServer } from './utils/httpServer';
import { InviteManager } from './managers/inviteManager';
import { WebhookManager } from './managers/webhookManager';
import { BackupManager } from './managers/backupManager';
import { startConsoleCapture } from './utils/consoleCapture';

startConsoleCapture();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Ajouter les propriétés manquantes
(client as any).commands = new Collection();
(client as any).cooldowns = new Collection();

async function initializeBot() {
    try {
        console.log('[INFO] Initialisation du bot...');
        
        // Charger les commandes
        await loadCommands(client);
        console.log('[INFO] Commandes chargées');
        
        // Charger les événements
        await loadEvents(client);
        console.log('[INFO] Événements chargés');
        
        // Initialiser la base de données
        const databaseManager = new DatabaseManager();
        await databaseManager.initialize();
        console.log('[INFO] Base de données initialisée');
        
        // Initialiser LogManager
        await LogManager.initialize(client);
        console.log('[INFO] LogManager initialisé');
        
        // Initialiser InviteManager
        await InviteManager.initialize(client);
        console.log('[INFO] InviteManager initialisé');
        
        // Initialiser WebhookManager
        await WebhookManager.initialize(client);
        console.log('[INFO] WebhookManager initialisé');
        
        // Initialiser BackupManager
        BackupManager.initialize();
        console.log('[INFO] BackupManager initialisé');
        
        // Connecter le bot
        await client.login(process.env.DISCORD_TOKEN);
        console.log('[INFO] Bot connecté avec succès!');
        
        // Attendre que le bot soit prêt avant de démarrer le serveur HTTP
        client.once('ready', () => {
            const apiKey = process.env.BOT_API_KEY || 'default-api-key-change-me';
            const httpPort = parseInt(process.env.BOT_HTTP_PORT || '3001', 10);
            const httpServer = new HttpServer(client, httpPort, apiKey);
            httpServer.start();
            console.log('[INFO] Bot initialisé avec succès!');
        });
        
    } catch (error) {
        console.error('[ERROR] Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[ERROR] Uncaught Exception:', error);
    process.exit(1);
});

// Démarrer le bot
initializeBot();
