import { 
  EmbedBuilder, 
  TextChannel, 
  GuildMember, 
  Message, 
  User,
  AuditLogEvent,
  GuildAuditLogsEntry,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface LogMessage {
  type: 'message_delete' | 'message_edit' | 'member_join' | 'member_leave' | 'role_add' | 'role_remove' | 'channel_create' | 'channel_delete' | 'ban' | 'kick' | 'warn' | 'lock' | 'vouch' | 'clear' | 'nuke' | 'verification';
  userId: string;
  moderatorId?: string;
  channelId?: string;
  reason?: string;
  amount?: number;
  data?: any;
}

export class LogManager {
  private static logChannel: TextChannel | null = null;
  private static databaseManager: DatabaseManager = new DatabaseManager();
  private static client: any = null;
  private static logsDir: string = join(__dirname, '../../logs/exported');

  constructor() {
    // Constructeur vide pour compatibilité
  }

  static async initialize(client: any) {
    LogManager.client = client;
    // Le canal sera récupéré dynamiquement quand nécessaire
    
    if (!existsSync(LogManager.logsDir)) {
      mkdirSync(LogManager.logsDir, { recursive: true });
    }
  }

  private static generateLogFile(logData: LogMessage, logId: string, timestamp: Date): string {
    const logContent = {
      logId,
      timestamp: timestamp.toISOString(),
      type: logData.type,
      userId: logData.userId,
      moderatorId: logData.moderatorId || 'N/A',
      channelId: logData.channelId || 'N/A',
      reason: logData.reason || 'N/A',
      amount: logData.amount || 'N/A',
      data: logData.data || {},
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    const fileName = `${logId}.json`;
    const filePath = join(LogManager.logsDir, fileName);
    
    writeFileSync(filePath, JSON.stringify(logContent, null, 2), 'utf-8');
    
    return fileName;
  }

  static async logMessage(logData: LogMessage) {
    if (!LogManager.client) {
      logger.warn('Client Discord non initialisé');
      return;
    }
    
    // Récupérer le canal de logs dynamiquement
    if (!LogManager.logChannel) {
      const guild = LogManager.client.guilds.cache.get(process.env.GUILD_ID || '');
      if (!guild) {
        logger.warn('Serveur non trouvé');
        return;
      }
      
      const channelId = process.env.LOG_CHANNEL_ID;
      if (!channelId) {
        logger.warn('Canal de logs non configuré');
        return;
      }
      
      LogManager.logChannel = guild.channels.cache.get(channelId) as TextChannel;
      if (!LogManager.logChannel) {
        logger.warn('Canal de logs introuvable');
        return;
      }
    }

    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    // Sauvegarder en base de données
    LogManager.databaseManager.addLog({
      id: logId,
      type: logData.type,
      userId: logData.userId,
      moderatorId: logData.moderatorId,
      channelId: logData.channelId,
      reason: logData.reason,
      data: logData.data,
      timestamp
    });

    // Générer le fichier de log
    const logFileName = LogManager.generateLogFile(logData, logId, timestamp);
    
    // Créer l'embed de log avec bouton de téléchargement
    const { embed, components } = await LogManager.createLogEmbed(logData, logId, timestamp, logFileName);
    
    try {
      await LogManager.logChannel.send({ embeds: [embed], components: components || [] });
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du log:', error);
    }
  }

  private static async createLogEmbed(logData: LogMessage, logId: string, timestamp: Date, logFileName: string): Promise<{ embed: EmbedBuilder; components: ActionRowBuilder<ButtonBuilder>[] }> {
    const embed = new EmbedBuilder()
      .setTimestamp(timestamp)
      .setFooter({ text: `€mynona Market • Log ID: ${logId} • ${timestamp.toLocaleString('fr-FR')}` });

    const user = await LogManager.client.users.fetch(logData.userId).catch(() => null);
    const moderator = logData.moderatorId ? await LogManager.client.users.fetch(logData.moderatorId).catch(() => null) : null;
    
    const downloadUrl = `${process.env.BOT_API_URL || 'http://93.127.160.64:3001'}/api/logs/download/${logFileName}`;
    const downloadButton = new ButtonBuilder()
      .setLabel('📥 Télécharger le log')
      .setStyle(ButtonStyle.Link)
      .setURL(downloadUrl);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(downloadButton);

    switch (logData.type) {
      case 'message_delete':
        embed
          .setTitle('🗑️ Message Supprimé')
          .setColor('#ff0000')
          .setDescription(`**Utilisateur:** ${user?.tag || 'Inconnu'} (${logData.userId})\n**Canal:** <#${logData.channelId}>\n**Raison:** ${logData.reason || 'Non spécifiée'}`)
          .addFields(
            { name: 'Contenu', value: logData.data?.originalContent || 'Non disponible', inline: false }
          );
        break;

      case 'message_edit':
        const oldContent = logData.data?.oldContent || 'Non disponible';
        const newContent = logData.data?.newContent || 'Non disponible';
        embed
          .setTitle('✏️ Message Modifié')
          .setColor('#ffff00')
          .setDescription(`**Action:** Modification de message`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '📝 Canal', value: logData.channelId ? `<#${logData.channelId}>` : 'N/A', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '📄 Avant', value: oldContent.length > 1024 ? oldContent.substring(0, 1021) + '...' : oldContent, inline: false },
            { name: '📄 Après', value: newContent.length > 1024 ? newContent.substring(0, 1021) + '...' : newContent, inline: false }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'member_join':
        embed
          .setTitle('👋 Membre Rejoint')
          .setColor('#00ff00')
          .setDescription(`**Action:** Nouveau membre sur le serveur`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '📅 Rejoint le', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '🆔 ID', value: logData.userId, inline: true },
            { name: '📅 Compte créé', value: user?.createdAt ? `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>` : 'Inconnu', inline: true },
            { name: '👥 Invité par', value: logData.data?.invitedBy ? `<@${logData.data.invitedBy}>` : 'Invitation inconnue', inline: true }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'member_leave':
        embed
          .setTitle('👋 Membre Parti')
          .setColor('#ff8800')
          .setDescription(`**Action:** Membre a quitté le serveur`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '📅 Parti le', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '🆔 ID', value: logData.userId, inline: true }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'ban':
        embed
          .setTitle('🔨 Utilisateur Banni')
          .setColor('#ff0000')
          .setDescription(`**Action:** Bannissement permanent`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag} (${logData.moderatorId})` : 'Inconnu', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '📋 Raison', value: logData.reason || 'Non spécifiée', inline: false }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'kick':
        embed
          .setTitle('👢 Utilisateur Expulsé')
          .setColor('#ff8800')
          .setDescription(`**Action:** Expulsion du serveur`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag} (${logData.moderatorId})` : 'Inconnu', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '📋 Raison', value: logData.reason || 'Non spécifiée', inline: false }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'warn':
        embed
          .setTitle('⚠️ Avertissement')
          .setColor('#ffff00')
          .setDescription(`**Action:** Avertissement attribué`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag} (${logData.moderatorId})` : 'Inconnu', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '📋 Raison', value: logData.reason || 'Non spécifiée', inline: false }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'role_add':
        embed
          .setTitle('➕ Rôle Ajouté')
          .setColor('#00ff00')
          .setDescription(`**Action:** Attribution de rôle`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '🎭 Rôle', value: logData.data?.roleId ? `<@&${logData.data.roleId}>` : 'N/A', inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag}` : logData.data?.method === 'web_oauth2' ? 'Système (OAuth2)' : 'Système', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '🌐 Méthode', value: logData.data?.method || 'Manuelle', inline: true }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'role_remove':
        embed
          .setTitle('➖ Rôle Retiré')
          .setColor('#ff0000')
          .setDescription(`**Action:** Retrait de rôle`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '🎭 Rôle', value: logData.data?.roleId ? `<@&${logData.data.roleId}>` : 'N/A', inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag}` : 'Système', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      case 'channel_create':
        embed
          .setTitle('📝 Canal Créé')
          .setColor('#00ff00')
          .setDescription(`**Action:** Création de canal`)
          .addFields(
            { name: '📝 Canal', value: logData.channelId ? `<#${logData.channelId}>` : 'N/A', inline: true },
            { name: '📋 Type', value: logData.data?.type || 'Inconnu', inline: true },
            { name: '👮 Créé par', value: moderator ? `${moderator.tag}` : 'Système', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true }
          );
        break;

      case 'channel_delete':
        embed
          .setTitle('🗑️ Canal Supprimé')
          .setColor('#ff0000')
          .setDescription(`**Action:** Suppression de canal`)
          .addFields(
            { name: '📝 Canal', value: logData.data?.channelName || 'Inconnu', inline: true },
            { name: '📋 Type', value: logData.data?.type || 'Inconnu', inline: true },
            { name: '👮 Supprimé par', value: moderator ? `${moderator.tag}` : 'Système', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true }
          );
        break;

      case 'clear':
        embed
          .setTitle('🧹 Messages Supprimés')
          .setColor('#00ff00')
          .setDescription(`**Action:** Suppression en masse de messages`)
          .addFields(
            { name: '📝 Canal', value: logData.channelId ? `<#${logData.channelId}>` : 'N/A', inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag}` : 'Inconnu', inline: true },
            { name: '📊 Nombre supprimé', value: `${logData.amount || 0}`, inline: true },
            { name: '👤 Utilisateur ciblé', value: logData.userId === 'all' ? 'Tous les utilisateurs' : `<@${logData.userId}>`, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '📋 Raison', value: logData.reason || 'Non spécifiée', inline: false }
          );
        break;

      case 'nuke':
        embed
          .setTitle('💥 Salon Nuké')
          .setColor('#ff0000')
          .setDescription(`**Action:** Suppression complète du salon`)
          .addFields(
            { name: '📝 Canal', value: logData.channelId ? `<#${logData.channelId}>` : 'N/A', inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag}` : 'Inconnu', inline: true },
            { name: '📊 Total supprimé', value: `${logData.amount || 0}`, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '⚠️ Action Irréversible', value: 'Tous les messages du salon ont été supprimés définitivement', inline: false },
            { name: '📋 Raison', value: logData.reason || 'Non spécifiée', inline: false }
          );
        break;

      case 'verification':
        embed
          .setTitle('✅ Vérification Réussie')
          .setColor('#00ff00')
          .setDescription(`**Action:** Vérification de compte`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '🎭 Rôle attribué', value: logData.data?.roleId ? `<@&${logData.data.roleId}>` : 'N/A', inline: true },
            { name: '🌐 Méthode', value: logData.data?.method || 'Inconnue', inline: true },
            { name: '📱 Plateforme', value: logData.data?.platform || 'Discord', inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '👮 Modérateur', value: moderator ? `${moderator.tag}` : 'Système automatique', inline: true }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
        break;

      default:
        embed
          .setTitle('📝 Log Système')
          .setColor('#0099ff')
          .setDescription(`**Action:** ${logData.type}`)
          .addFields(
            { name: '👤 Utilisateur', value: `${user?.tag || 'Inconnu'} (${logData.userId})`, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: '📋 Raison', value: logData.reason || 'Non spécifiée', inline: false }
          )
          .setThumbnail(user?.displayAvatarURL() || null);
    }

    return { embed, components: [row] };
  }

  static async logMemberJoin(member: GuildMember) {
    await LogManager.logMessage({
      type: 'member_join',
      userId: member.id,
      data: {
        username: member.user.username,
        discriminator: member.user.discriminator,
        accountCreated: member.user.createdAt
      }
    });
  }

  static async logMemberLeave(member: GuildMember) {
    await LogManager.logMessage({
      type: 'member_leave',
      userId: member.id,
      data: {
        username: member.user.username,
        discriminator: member.user.discriminator,
        joinedAt: member.joinedAt
      }
    });
  }

  static async logMessageDelete(message: Message, reason?: string) {
    await LogManager.logMessage({
      type: 'message_delete',
      userId: message.author.id,
      channelId: message.channel.id,
      reason: reason || 'Message supprimé',
      data: {
        originalContent: message.content,
        attachments: message.attachments.map(att => att.url)
      }
    });
  }

  static async logMessageEdit(oldMessage: Message, newMessage: Message) {
    await LogManager.logMessage({
      type: 'message_edit',
      userId: newMessage.author.id,
      channelId: newMessage.channel.id,
      data: {
        oldContent: oldMessage.content,
        newContent: newMessage.content
      }
    });
  }
}

