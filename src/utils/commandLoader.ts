import { Client } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Command } from '../types/command';
import { logger } from './logger';

export async function loadCommands(client: Client) {
  const commandsPath = join(__dirname, '../commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const commandFiles = readdirSync(join(commandsPath, folder)).filter(file => 
      file.endsWith('.js') && !file.endsWith('.d.ts')
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, folder, file);
      
      try {
        const commandModule = await import(filePath);
        
        // Chercher l'export nommé (premier export qui est un Command)
        const commandExport = Object.values(commandModule).find(
          (exp: any) => exp && typeof exp === 'object' && 'data' in exp && 'execute' in exp
        ) as Command | undefined;
        
        if (commandExport) {
          (client as any).commands.set(commandExport.data.name, commandExport);
          logger.info(`Commande chargée: ${commandExport.data.name}`);
        } else {
          logger.warn(`La commande dans ${filePath} n'a pas de propriété "data" ou "execute" requise.`);
        }
      } catch (error) {
        logger.error(`Erreur lors du chargement de la commande ${filePath}:`, error);
      }
    }
  }
}

