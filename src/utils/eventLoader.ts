import { Client, Events } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

export async function loadEvents(client: Client) {
  const eventsPath = join(__dirname, '../events');
  const eventFiles = readdirSync(eventsPath).filter(file => 
    file.endsWith('.js') && !file.endsWith('.d.ts')
  );

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    
    try {
      const event = await import(filePath);
      
      // Vérifier que l'événement a les propriétés requises
      if (!event.name || !event.execute) {
        logger.warn(`L'événement dans ${file} n'a pas de propriété "name" ou "execute" requise.`);
        return;
      }
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      
      logger.info(`Événement chargé: ${event.name}`);
    } catch (error) {
      logger.error(`Erreur lors du chargement de l'événement ${filePath}:`, error);
    }
  }
}



