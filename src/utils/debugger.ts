import { Client, Guild, TextChannel, User, GuildMember } from 'discord.js';
import { logger } from './logger';

export class BotDebugger {
  private client: Client;
  private debugChannel: TextChannel | null = null;
  private isDebugMode: boolean = true;
  private errorCount: number = 0;
  private warningCount: number = 0;
  private commandCount: number = 0;
  private messageCount: number = 0;
  private startTime: Date = new Date();

  constructor(client: Client) {
    this.client = client;
  }

  async initialize() {
    if (!this.isDebugMode) return;

    try {
      const guild = this.client.guilds.cache.get(process.env.GUILD_ID || '');
      if (guild && process.env.DEBUG_CHANNEL_ID) {
        this.debugChannel = guild.channels.cache.get(process.env.DEBUG_CHANNEL_ID) as TextChannel;
      }

      await this.sendDebugMessage('🚀 **Bot Debugger Initialisé**', {
        color: '#00ff00',
        fields: [
          { name: 'Status', value: '✅ Actif', inline: true },
          { name: 'Mode', value: '🔍 Debug Complet', inline: true },
          { name: 'Timestamp', value: new Date().toISOString(), inline: true }
        ]
      });

      // Démarrer le monitoring
      this.startMonitoring();
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du debugger:', error);
    }
  }

  private startMonitoring() {
    // Monitoring toutes les 30 secondes
    setInterval(() => {
      this.sendStatusUpdate();
    }, 30000);

    // Monitoring des erreurs en temps réel
    process.on('unhandledRejection', (reason, promise) => {
      this.logError('Unhandled Rejection', reason, { promise });
    });

    process.on('uncaughtException', (error) => {
      this.logError('Uncaught Exception', error);
    });
  }

  async logError(title: string, error: any, context?: any) {
    this.errorCount++;
    
    const errorInfo = {
      title: `❌ **${title}**`,
      color: '#ff0000',
      fields: [
        { name: 'Erreur', value: error?.message || String(error), inline: false },
        { name: 'Stack', value: error?.stack?.substring(0, 1000) || 'N/A', inline: false },
        { name: 'Contexte', value: context ? JSON.stringify(context, null, 2).substring(0, 500) : 'N/A', inline: false },
        { name: 'Timestamp', value: new Date().toISOString(), inline: true },
        { name: 'Total Erreurs', value: this.errorCount.toString(), inline: true }
      ]
    };

    await this.sendDebugMessage(errorInfo.title, errorInfo);
    logger.error(`${title}:`, error, context);
  }

  async logWarning(title: string, message: string, context?: any) {
    this.warningCount++;
    
    const warningInfo = {
      title: `⚠️ **${title}**`,
      color: '#ffaa00',
      fields: [
        { name: 'Message', value: message, inline: false },
        { name: 'Contexte', value: context ? JSON.stringify(context, null, 2).substring(0, 500) : 'N/A', inline: false },
        { name: 'Timestamp', value: new Date().toISOString(), inline: true },
        { name: 'Total Warnings', value: this.warningCount.toString(), inline: true }
      ]
    };

    await this.sendDebugMessage(warningInfo.title, warningInfo);
    logger.warn(`${title}: ${message}`, context);
  }

  async logCommand(commandName: string, user: User, success: boolean, error?: any) {
    this.commandCount++;
    
    const status = success ? '✅' : '❌';
    const color = success ? '#00ff00' : '#ff0000';
    
    const commandInfo = {
      title: `${status} **Commande Exécutée**`,
      color: color,
      fields: [
        { name: 'Commande', value: `\`/${commandName}\``, inline: true },
        { name: 'Utilisateur', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Status', value: success ? 'Succès' : 'Échec', inline: true },
        { name: 'Erreur', value: error?.message || 'N/A', inline: false },
        { name: 'Timestamp', value: new Date().toISOString(), inline: true },
        { name: 'Total Commandes', value: this.commandCount.toString(), inline: true }
      ]
    };

    await this.sendDebugMessage(commandInfo.title, commandInfo);
  }

  async logMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const colors = {
      info: '#0099ff',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff0000'
    };

    const messageInfo = {
      title: `${icons[type]} **${message}**`,
      color: colors[type],
      fields: [
        { name: 'Timestamp', value: new Date().toISOString(), inline: true },
        { name: 'Type', value: type.toUpperCase(), inline: true }
      ]
    };

    await this.sendDebugMessage(messageInfo.title, messageInfo);
  }

  private async sendStatusUpdate() {
    if (!this.debugChannel) return;

    const uptime = this.getUptime();
    const memoryUsage = process.memoryUsage();
    const guildCount = this.client.guilds.cache.size;
    const userCount = this.client.users.cache.size;
    const channelCount = this.client.channels.cache.size;

    const statusInfo = {
      title: '📊 **Status du Bot**',
      color: '#0099ff',
      fields: [
        { name: '🕐 Uptime', value: uptime, inline: true },
        { name: '🏠 Serveurs', value: guildCount.toString(), inline: true },
        { name: '👥 Utilisateurs', value: userCount.toString(), inline: true },
        { name: '📺 Canaux', value: channelCount.toString(), inline: true },
        { name: '💾 Mémoire', value: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`, inline: true },
        { name: '📈 Commandes', value: this.commandCount.toString(), inline: true },
        { name: '❌ Erreurs', value: this.errorCount.toString(), inline: true },
        { name: '⚠️ Warnings', value: this.warningCount.toString(), inline: true },
        { name: '💬 Messages', value: this.messageCount.toString(), inline: true }
      ]
    };

    await this.sendDebugMessage(statusInfo.title, statusInfo);
  }

  private getUptime(): string {
    const uptime = Date.now() - this.startTime.getTime();
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  private async sendDebugMessage(title: string, data: any) {
    if (!this.debugChannel) return;

    try {
      const { EmbedBuilder } = await import('discord.js');
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(data.color || '#0099ff')
        .setTimestamp();

      if (data.fields) {
        embed.addFields(data.fields);
      }

      if (data.description) {
        embed.setDescription(data.description);
      }

      await this.debugChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du message de debug:', error);
    }
  }

  // Méthodes pour les événements spécifiques
  async logGuildJoin(guild: Guild) {
    await this.logMessage(`Bot ajouté au serveur: ${guild.name} (${guild.id})`, 'success');
  }

  async logGuildLeave(guild: Guild) {
    await this.logMessage(`Bot retiré du serveur: ${guild.name} (${guild.id})`, 'warning');
  }

  async logMemberJoin(member: GuildMember) {
    await this.logMessage(`Nouveau membre: ${member.user.tag} sur ${member.guild.name}`, 'info');
  }

  async logMemberLeave(member: GuildMember) {
    await this.logMessage(`Membre parti: ${member.user.tag} de ${member.guild.name}`, 'info');
  }

  async logMessageProcessed() {
    this.messageCount++;
  }

  // Méthode pour diagnostiquer les erreurs de compilation
  async diagnoseCompilationErrors(errors: any[]) {
    await this.logMessage('🔍 **Diagnostic des Erreurs de Compilation**', 'warning');
    
    for (const error of errors) {
      const errorDetails = {
        title: `❌ **Erreur de Compilation**`,
        color: '#ff0000',
        fields: [
          { name: 'Fichier', value: error.fileName || 'Inconnu', inline: true },
          { name: 'Ligne', value: error.lineNumber?.toString() || 'N/A', inline: true },
          { name: 'Code', value: error.code?.toString() || 'N/A', inline: true },
          { name: 'Message', value: error.message || 'Erreur inconnue', inline: false },
          { name: 'Suggestion', value: this.getErrorSuggestion(error), inline: false }
        ]
      };

      await this.sendDebugMessage(errorDetails.title, errorDetails);
    }
  }

  private getErrorSuggestion(error: any): string {
    const code = error.code;
    
    switch (code) {
      case 2339:
        return 'Propriété manquante - Vérifiez les imports et les types';
      case 2724:
        return 'Module non trouvé - Vérifiez le chemin d\'import';
      case 2307:
        return 'Module introuvable - Vérifiez l\'existence du fichier';
      case 7006:
        return 'Paramètre implicitement any - Ajoutez des types explicites';
      case 18047:
        return 'Erreur de syntaxe - Vérifiez la syntaxe TypeScript';
      case 1002:
        return 'Erreur de syntaxe - Vérifiez les caractères spéciaux';
      case 1434:
        return 'Mot-clé inattendu - Vérifiez la syntaxe';
      case 1109:
        return 'Expression attendue - Vérifiez la structure du code';
      case 18048:
        return 'Erreur de type - Vérifiez la compatibilité des types';
      case 2345:
        return 'Argument manquant - Vérifiez les paramètres requis';
      case 18046:
        return 'Erreur de compilation - Vérifiez la syntaxe générale';
      default:
        return 'Erreur inconnue - Consultez la documentation TypeScript';
    }
  }

  // Méthode pour activer/désactiver le debug
  setDebugMode(enabled: boolean) {
    this.isDebugMode = enabled;
    this.logMessage(`Mode debug ${enabled ? 'activé' : 'désactivé'}`, 'info');
  }

  // Méthode pour obtenir les statistiques
  getStats() {
    return {
      uptime: this.getUptime(),
      errors: this.errorCount,
      warnings: this.warningCount,
      commands: this.commandCount,
      messages: this.messageCount,
      startTime: this.startTime
    };
  }
}


























