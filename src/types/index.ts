import { Client } from 'discord.js';

declare global {
    namespace NodeJS {
        interface Global {
            simpleDebugger: any;
        }
    }
}

export interface Command {
    name: string;
    description: string;
    execute: (interaction: any) => Promise<void>;
}

export interface EmbedData {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    footer?: {
        text: string;
        iconURL?: string;
    };
    thumbnail?: string;
    image?: string;
}

export interface ServerConfig {
    guildId: string;
    ticketChannelId?: string;
    logChannelId?: string;
    vouchChannelId?: string;
    captchaChannelId?: string;
    autoroleId?: string;
    vouchRoleId?: string;
}

export interface CaptchaData {
    userId: string;
    answer: string;
    timestamp: number;
}

export interface TicketData {
    id: string;
    userId: string;
    channelId: string;
    service: string;
    status: 'open' | 'closed';
    createdAt: number;
}

export interface VouchData {
    id: string;
    userId: string;
    targetUserId: string;
    rating: number;
    comment: string;
    timestamp: number;
}

export interface LogData {
    id: string;
    type: 'warn' | 'message_delete' | 'message_update' | 'member_join' | 'member_leave' | 'ban' | 'kick' | 'lock' | 'unlock' | 'vouch' | 'ticket_create' | 'ticket_close';
    userId: string;
    targetUserId?: string;
    channelId?: string;
    reason?: string;
    timestamp: number;
    details?: any;
}

export interface LogMessage {
    type: 'warn' | 'message_delete' | 'message_update' | 'member_join' | 'member_leave' | 'ban' | 'kick' | 'lock' | 'unlock' | 'vouch' | 'ticket_create' | 'ticket_close';
    userId: string;
    targetUserId?: string;
    channelId?: string;
    reason?: string;
    details?: any;
}

























