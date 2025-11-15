import { Message, TextChannel } from 'discord.js';
import { logger } from '../utils/logger';
import { DatabaseManager } from '../database/databaseManager';
import { LogManager } from './logManager';

export class AntiScamManager {
  private databaseManager: DatabaseManager;
  private logManager: LogManager;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.logManager = new LogManager();
  }
  private suspiciousPatterns = [
    /discord\.gg\/[a-zA-Z0-9]+/gi,
    /discord\.com\/invite\/[a-zA-Z0-9]+/gi,
    /bit\.ly\/[a-zA-Z0-9]+/gi,
    /tinyurl\.com\/[a-zA-Z0-9]+/gi,
    /t\.me\/[a-zA-Z0-9]+/gi,
    /telegram\.me\/[a-zA-Z0-9]+/gi,
    /steamcommunity\.com\/id\/[a-zA-Z0-9]+/gi,
    /steamcommunity\.com\/profiles\/[0-9]+/gi
  ];

  private suspiciousKeywords = [
    'free nitro',
    'free discord nitro',
    'nitro generator',
    'discord nitro free',
    'click here for nitro',
    'get free nitro',
    'nitro giveaway',
    'free money',
    'free robux',
    'free vbucks',
    'free steam games',
    'steam key generator',
    'free gift card',
    'gift card generator',
    'crypto giveaway',
    'bitcoin free',
    'free paypal money',
    'paypal generator'
  ];

  private userWarnings = new Map<string, { count: number; lastWarning: number }>();

  async checkMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const config = this.databaseManager.getServerConfig(message.guild.id);
    if (!config?.antiScamEnabled) return false;

    const content = message.content.toLowerCase();
    let isSuspicious = false;
    let reason = '';

    // Vérifier les liens suspects
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        isSuspicious = true;
        reason = 'Lien suspect détecté';
        break;
      }
    }

    // Vérifier les mots-clés suspects
    if (!isSuspicious) {
      for (const keyword of this.suspiciousKeywords) {
        if (content.includes(keyword)) {
          isSuspicious = true;
          reason = 'Mots-clés suspects détectés';
          break;
        }
      }
    }

    // Vérifier les patterns de spam
    if (!isSuspicious && this.isSpamPattern(content)) {
      isSuspicious = true;
      reason = 'Pattern de spam détecté';
    }

    if (isSuspicious) {
      await this.handleSuspiciousMessage(message, reason);
      return true;
    }

    return false;
  }

  private isSpamPattern(content: string): boolean {
    // Vérifier les répétitions de caractères
    const repeatedChars = /(.)\1{4,}/g;
    if (repeatedChars.test(content)) return true;

    // Vérifier les mentions excessives
    const mentions = content.match(/<@!?\d+>/g);
    if (mentions && mentions.length > 5) return true;

    // Vérifier les caractères spéciaux excessifs
    const specialChars = content.match(/[!@#$%^&*()_+=\[\]{}|;':",./<>?~`]/g);
    if (specialChars && specialChars.length > content.length * 0.3) return true;

    return false;
  }

  private async handleSuspiciousMessage(message: Message, reason: string) {
    const userId = message.author.id;
    const currentTime = Date.now();
    
    // Obtenir ou créer les avertissements de l'utilisateur
    let warnings = this.userWarnings.get(userId) || { count: 0, lastWarning: 0 };
    
    // Réinitialiser le compteur si plus de 24h se sont écoulées
    if (currentTime - warnings.lastWarning > 24 * 60 * 60 * 1000) {
      warnings.count = 0;
    }

    warnings.count++;
    warnings.lastWarning = currentTime;
    this.userWarnings.set(userId, warnings);

    // Supprimer le message
    try {
      await message.delete();
    } catch (error) {
      logger.error('Erreur lors de la suppression du message suspect:', error);
    }

    // Envoyer un avertissement à l'utilisateur
    try {
      await message.author.send({
        content: `⚠️ **Message supprimé - Contenu suspect détecté**\n\n` +
                `**Raison:** ${reason}\n` +
                `**Avertissement:** ${warnings.count}/3\n\n` +
                `Veuillez respecter les règles du serveur.`
      });
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de l\'avertissement:', error);
    }

    // Logger l'incident
    await LogManager.logMessage({
      type: 'message_delete',
      userId: message.author.id,
      channelId: message.channel.id,
      reason: `Anti-scam: ${reason}`,
      data: {
        originalContent: message.content,
        warningCount: warnings.count
      }
    });

    // Actions selon le nombre d'avertissements
    if (warnings.count >= 3) {
      await this.handleRepeatedViolations(message);
    }
  }

  private async handleRepeatedViolations(message: Message) {
    const member = message.guild?.members.cache.get(message.author.id);
    if (!member) return;

    try {
      // Timeout de 1 heure
      await member.timeout(60 * 60 * 1000, 'Violations répétées du système anti-scam');
      
      await LogManager.logMessage({
        type: 'warn',
        userId: message.author.id,
        moderatorId: message.client.user?.id || 'system',
        reason: 'Violations répétées du système anti-scam',
        data: { action: 'timeout', duration: '1 hour' }
      });

      logger.info(`Utilisateur ${message.author.tag} mis en timeout pour violations répétées`);
    } catch (error) {
      logger.error('Erreur lors de la mise en timeout:', error);
    }
  }
}

