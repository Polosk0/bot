import { Events, Client } from 'discord.js';
import { logger } from '../utils/logger';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  logger.info(`Bot connecté en tant que ${client.user?.tag}!`);
  
  // Définir le statut du bot
  client.user?.setPresence({
    activities: [{
      name: 'Market Server | /help',
      type: 3 // WATCHING
    }],
    status: 'online'
  });

  // Synchroniser les commandes slash
  try {
    if (!client.application) {
      logger.error('❌ client.application est null/undefined - impossible de synchroniser les commandes');
      return;
    }

    const commands = Array.from((client as any).commands.values()).map((cmd: any) => cmd.data.toJSON());
    const commandNames = commands.map((cmd: any) => cmd.name).join(', ');
    logger.info(`🔄 Synchronisation de ${commands.length} commandes avec Discord...`);
    logger.info(`📋 Commandes: ${commandNames}`);
    
    const result = await client.application.commands.set(commands);
    logger.info(`✅ ${result.size} commandes slash synchronisées avec succès sur Discord`);
    logger.info(`📝 Commandes synchronisées: ${Array.from(result.values()).map((c: any) => c.name).join(', ')}`);
  } catch (error) {
    logger.error('❌ Erreur lors de la synchronisation des commandes:', error);
    if (error instanceof Error) {
      logger.error(`Détails de l'erreur: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
    }
  }

  // Le cache des invitations est initialisé via InviteManager dans index.ts
}

