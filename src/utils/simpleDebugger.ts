import { Client } from 'discord.js';

export class SimpleDebugger {
    private client: Client;
    private errors: string[] = [];
    private compilationInfo: string[] = [];
    private status: string = 'Initializing';

    constructor(client: Client) {
        this.client = client;
        this.status = 'Ready';
    }

    logCommand(command: string, user: string) {
        console.log(`[COMMAND] ${command} by ${user}`);
    }

    logEvent(event: string, details?: string) {
        console.log(`[EVENT] ${event}${details ? ` - ${details}` : ''}`);
    }

    logError(error: string, context?: string) {
        const errorMsg = `[ERROR] ${error}${context ? ` in ${context}` : ''}`;
        console.error(errorMsg);
        this.errors.push(errorMsg);
    }

    logSuccess(message: string) {
        console.log(`[SUCCESS] ${message}`);
    }

    logMessageProcessed(messageId: string, channelId: string) {
        console.log(`[MESSAGE] Processed message ${messageId} in channel ${channelId}`);
    }

    getStatus() {
        return {
            status: this.status,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            errors: this.errors.length,
            compilation: this.compilationInfo.length
        };
    }

    getErrors() {
        return this.errors;
    }

    getCompilationInfo() {
        return this.compilationInfo;
    }

    addCompilationInfo(info: string) {
        this.compilationInfo.push(info);
    }
}

export const simpleDebugger = new SimpleDebugger({} as Client);

























