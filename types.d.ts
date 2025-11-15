import { Collection } from 'discord.js';
import { Command } from './src/types/command';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}







