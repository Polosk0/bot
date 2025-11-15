import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  permissions?: PermissionResolvable[];
  cooldown?: number;
  category: 'moderation' | 'utility' | 'ticket' | 'embed' | 'vouch' | 'security';
}

export interface CommandCooldown {
  userId: string;
  commandName: string;
  timestamp: number;
}

export interface EmbedData {
  title?: string;
  description?: string;
  color?: string;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  thumbnail?: string;
  image?: string;
  footer?: {
    text: string;
    iconURL?: string;
  };
  author?: {
    name: string;
    iconURL?: string;
    url?: string;
  };
  timestamp?: boolean;
}

