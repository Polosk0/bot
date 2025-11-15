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
    const commands = Array.from((client as any).commands.values()).map((cmd: any) => cmd.data.toJSON());
    await client.application?.commands.set(commands);
    logger.info(`${commands.length} commandes slash synchronisées`);
  } catch (error) {
    logger.error('Erreur lors de la synchronisation des commandes:', error);
  }

  // Le cache des invitations est initialisé via InviteManager dans index.ts
}

