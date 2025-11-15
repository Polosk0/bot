import {
  Guild,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  ForumChannel,
  ThreadChannel,
  NewsChannel,
  StageChannel,
  GuildBasedChannel,
  Embed,
  EmbedBuilder,
  ChannelType,
  Collection,
  AttachmentBuilder,
  Message,
  APIEmbed,
  User,
  PermissionsBitField,
  OverwriteType,
  DiscordAPIError
} from 'discord.js';
import { logger } from '../utils/logger';
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { Buffer } from 'buffer';
import axios from 'axios';

export interface BackupData {
  id: string;
  guildId: string;
  guildName: string;
  createdAt: string;
  createdBy: string;
  version: string;
  server: {
    name: string;
    icon: string | null;
    banner: string | null;
    description: string | null;
    verificationLevel: number;
    defaultMessageNotifications: number;
    explicitContentFilter: number;
    afkChannelId: string | null;
    afkTimeout: number;
    systemChannelId: string | null;
    rulesChannelId: string | null;
    publicUpdatesChannelId: string | null;
  };
  roles: BackupRole[];
  channels: BackupChannel[];
  emojis: BackupEmoji[];
  stickers: BackupSticker[];
  webhooks: BackupWebhook[];
}

export interface BackupRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
  position: number;
  icon: string | null;
  unicodeEmoji: string | null;
}

export interface BackupChannel {
  id: string;
  name: string;
  type: ChannelType;
  position: number;
  parentId: string | null;
  topic: string | null;
  nsfw: boolean;
  bitrate: number | null;
  userLimit: number | null;
  rateLimitPerUser: number | null;
  permissionOverwrites: BackupPermissionOverwrite[];
  messages: BackupMessage[];
  threads?: BackupThread[];
}

export interface BackupThread {
  id: string;
  name: string;
  type: number;
  archived: boolean;
  archivedTimestamp: string | null;
  autoArchiveDuration: number | null;
  locked: boolean;
  messages: BackupMessage[];
}

export interface BackupMessage {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorDiscriminator: string;
  authorAvatar: string | null;
  authorBot: boolean;
  timestamp: string;
  editedTimestamp: string | null;
  pinned: boolean;
  embeds: APIEmbed[];
  attachments: BackupAttachment[];
  reactions: BackupReaction[];
  mentions: string[];
}

export interface BackupAttachment {
  id: string;
  name: string;
  url: string;
  proxyUrl: string;
  size: number;
  contentType: string | null;
  height: number | null;
  width: number | null;
  ephemeral: boolean;
  description: string | null;
  localPath?: string;
}

export interface BackupReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface BackupPermissionOverwrite {
  id: string;
  type: OverwriteType;
  allow: string;
  deny: string;
}

export interface BackupEmoji {
  id: string;
  name: string;
  animated: boolean;
  url: string;
  localPath?: string;
}

export interface BackupSticker {
  id: string;
  name: string;
  description: string | null;
  tags: string;
  format: number;
  url: string;
  localPath?: string;
}

export interface BackupWebhook {
  id: string;
  name: string;
  avatar: string | null;
  channelId: string;
  type: number;
  url: string;
}

type RestoreStage = 'roles' | 'emojis' | 'stickers' | 'channels' | 'serverSettings';

interface RestoreCheckpoint {
  backupId: string;
  guildId: string;
  stages: Record<RestoreStage, boolean>;
  roleMap?: Record<string, string>;
  channelMap?: Record<string, string>;
  updatedAt: string;
}

interface ResetOptions {
  clearChannels: boolean;
  clearRoles: boolean;
  clearEmojis: boolean;
  clearStickers: boolean;
}

interface PreparedAttachment {
  builder: AttachmentBuilder;
  size: number;
  name: string;
}

export class BackupManager {
  private static backupsDir: string = join(__dirname, '../../backups');
  private static attachmentsDir: string = join(__dirname, '../../backups/attachments');
  private static emojisDir: string = join(__dirname, '../../backups/emojis');
  private static stickersDir: string = join(__dirname, '../../backups/stickers');
  private static readonly ROLE_RESTORE_DELAY = 500;
  private static readonly EMOJI_RESTORE_DELAY = 2500;
  private static readonly STICKER_RESTORE_DELAY = 3000;
  private static readonly ROLE_DELETE_EXCLUSIONS = new Set(['Admin 👀']);
  private static readonly MAX_FILES_PER_MESSAGE = 10;
  private static attachmentLimitBytesCache: number | null = null;

  private static getAttachmentLimitBytes(): number {
    if (this.attachmentLimitBytesCache) {
      return this.attachmentLimitBytesCache;
    }
    const envLimit =
      Number(process.env.DISCORD_ATTACHMENT_LIMIT_MB) || Number(process.env.BACKUP_ATTACHMENT_LIMIT_MB);
    const limitMb = Number.isFinite(envLimit) && envLimit > 0 ? envLimit : 8;
    this.attachmentLimitBytesCache = limitMb * 1024 * 1024;
    return this.attachmentLimitBytesCache;
  }

  private static getAttachmentLimitMb(): number {
    return this.getAttachmentLimitBytes() / (1024 * 1024);
  }
  private static readonly DEFAULT_CHECKPOINT: Record<RestoreStage, boolean> = {
    roles: false,
    emojis: false,
    stickers: false,
    channels: false,
    serverSettings: false
  };

  static initialize() {
    if (!existsSync(this.backupsDir)) {
      mkdirSync(this.backupsDir, { recursive: true });
    }
    if (!existsSync(this.attachmentsDir)) {
      mkdirSync(this.attachmentsDir, { recursive: true });
    }
    if (!existsSync(this.emojisDir)) {
      mkdirSync(this.emojisDir, { recursive: true });
    }
    if (!existsSync(this.stickersDir)) {
      mkdirSync(this.stickersDir, { recursive: true });
    }
  }

  static async createBackup(guild: Guild, createdBy: string, includeMessages: boolean = true): Promise<BackupData> {
    logger.info(`[BACKUP] Début de la création du backup pour ${guild.name} (${guild.id})`);
    
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const backupDir = join(this.backupsDir, backupId);
    mkdirSync(backupDir, { recursive: true });

    const backupData: BackupData = {
      id: backupId,
      guildId: guild.id,
      guildName: guild.name,
      createdAt: new Date().toISOString(),
      createdBy: createdBy,
      version: '1.0.0',
      server: {
        name: guild.name,
        icon: guild.iconURL({ size: 4096 }),
        banner: guild.bannerURL({ size: 4096 }),
        description: guild.description || null,
        verificationLevel: guild.verificationLevel,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter: guild.explicitContentFilter,
        afkChannelId: guild.afkChannelId,
        afkTimeout: guild.afkTimeout,
        systemChannelId: guild.systemChannelId,
        rulesChannelId: guild.rulesChannelId,
        publicUpdatesChannelId: guild.publicUpdatesChannelId
      },
      roles: [],
      channels: [],
      emojis: [],
      stickers: [],
      webhooks: []
    };

    logger.info(`[BACKUP] Sauvegarde des rôles...`);
    backupData.roles = await this.backupRoles(guild);

    logger.info(`[BACKUP] Sauvegarde des emojis...`);
    backupData.emojis = await this.backupEmojis(guild, backupId);

    logger.info(`[BACKUP] Sauvegarde des stickers...`);
    backupData.stickers = await this.backupStickers(guild, backupId);

    logger.info(`[BACKUP] Sauvegarde des canaux...`);
    backupData.channels = await this.backupChannels(guild, backupId, includeMessages);

    logger.info(`[BACKUP] Sauvegarde des webhooks...`);
    backupData.webhooks = await this.backupWebhooks(guild);

    const backupFilePath = join(backupDir, 'backup.json');
    writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
    
    logger.info(`[BACKUP] Backup créé avec succès: ${backupId}`);
    return backupData;
  }

  private static async backupRoles(guild: Guild): Promise<BackupRole[]> {
    const roles: BackupRole[] = [];
    
    for (const role of guild.roles.cache.sort((a, b) => b.position - a.position).values()) {
      if (role.id === guild.id) continue;
      
      roles.push({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.bitfield.toString(),
        position: role.position,
        icon: role.iconURL({ size: 4096 }),
        unicodeEmoji: role.unicodeEmoji
      });
    }
    
    return roles;
  }

  private static async backupEmojis(guild: Guild, backupId: string): Promise<BackupEmoji[]> {
    const emojis: BackupEmoji[] = [];
    const emojiDir = join(this.emojisDir, backupId);
    mkdirSync(emojiDir, { recursive: true });

    for (const emoji of guild.emojis.cache.values()) {
      try {
        const emojiUrl = emoji.url;
        const fileName = `${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
        const emojiPath = join(emojiDir, fileName);
        
        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        writeFileSync(emojiPath, buffer);

        emojis.push({
          id: emoji.id,
          name: emoji.name || 'unknown',
          animated: emoji.animated,
          url: emojiUrl,
          localPath: fileName
        });
      } catch (error) {
        logger.error(`[BACKUP] Erreur lors de la sauvegarde de l'emoji ${emoji.name}:`, error);
      }
    }

    return emojis;
  }

  private static async backupStickers(guild: Guild, backupId: string): Promise<BackupSticker[]> {
    const stickers: BackupSticker[] = [];
    const stickerDir = join(this.stickersDir, backupId);
    mkdirSync(stickerDir, { recursive: true });

    for (const sticker of guild.stickers.cache.values()) {
      try {
        const stickerUrl = sticker.url;
        const extension = sticker.format === 1 ? 'png' : sticker.format === 2 ? 'apng' : sticker.format === 3 ? 'lottie' : 'json';
        const fileName = `${sticker.id}.${extension}`;
        const stickerPath = join(stickerDir, fileName);
        
        const response = await axios.get(stickerUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        writeFileSync(stickerPath, buffer);

        stickers.push({
          id: sticker.id,
          name: sticker.name,
          description: sticker.description,
          tags: sticker.tags ?? '',
          format: sticker.format,
          url: stickerUrl,
          localPath: fileName
        });
      } catch (error) {
        logger.error(`[BACKUP] Erreur lors de la sauvegarde du sticker ${sticker.name}:`, error);
      }
    }

    return stickers;
  }

  private static async backupChannels(guild: Guild, backupId: string, includeMessages: boolean): Promise<BackupChannel[]> {
    const channels: BackupChannel[] = [];
    const attachmentsDir = join(this.attachmentsDir, backupId);
    mkdirSync(attachmentsDir, { recursive: true });

    const sortedChannels = [...guild.channels.cache.values()]
      .filter(isBackupEligibleChannel)
      .sort((a, b) => a.position - b.position);

    for (const channel of sortedChannels) {
      const backupChannel: BackupChannel = {
        id: channel.id,
        name: channel.name || 'unknown',
        type: channel.type,
        position: channel.position,
        parentId: channel.parentId ?? null,
        topic: null,
        nsfw: false,
        bitrate: null,
        userLimit: null,
        rateLimitPerUser: null,
        permissionOverwrites: [],
        messages: []
      };

      if (channel instanceof TextChannel || channel instanceof ForumChannel) {
        backupChannel.topic = channel.topic || null;
        backupChannel.nsfw = channel.nsfw ?? false;
        backupChannel.rateLimitPerUser = channel.rateLimitPerUser ?? null;
      }

      if (channel instanceof VoiceChannel) {
        backupChannel.bitrate = channel.bitrate ?? null;
        backupChannel.userLimit = channel.userLimit ?? null;
      }

      backupChannel.permissionOverwrites = channel.permissionOverwrites.cache.map(overwrite => ({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow.bitfield.toString(),
        deny: overwrite.deny.bitfield.toString()
      }));

      if (includeMessages && channel instanceof TextChannel) {
        logger.info(`[BACKUP] Sauvegarde des messages du canal ${channel.name}...`);
        backupChannel.messages = await this.backupMessages(channel, attachmentsDir);
      }

      if (channel instanceof TextChannel && includeMessages) {
        backupChannel.threads = [];
        for (const thread of channel.threads.cache.values()) {
          const threadMessages = await this.backupMessages(thread, attachmentsDir);
          backupChannel.threads.push({
            id: thread.id,
            name: thread.name,
            type: thread.type,
            archived: thread.archived ?? false,
            archivedTimestamp: thread.archiveTimestamp ? new Date(thread.archiveTimestamp).toISOString() : null,
            autoArchiveDuration: thread.autoArchiveDuration ?? null,
            locked: thread.locked ?? false,
            messages: threadMessages
          });
        }
      }

      if (channel instanceof ForumChannel && includeMessages) {
        backupChannel.threads = backupChannel.threads || [];
        const forumThreads = await channel.threads.fetch();
        for (const thread of forumThreads.threads.values()) {
          const threadMessages = await this.backupMessages(thread, attachmentsDir);
          backupChannel.threads.push({
            id: thread.id,
            name: thread.name,
            type: thread.type,
            archived: thread.archived ?? false,
            archivedTimestamp: thread.archiveTimestamp ? new Date(thread.archiveTimestamp).toISOString() : null,
            autoArchiveDuration: thread.autoArchiveDuration ?? null,
            locked: thread.locked ?? false,
            messages: threadMessages
          });
        }
      }

      channels.push(backupChannel);
    }

    return channels;
  }

  private static async backupMessages(channel: TextChannel | ThreadChannel, attachmentsDir: string): Promise<BackupMessage[]> {
    const messages: BackupMessage[] = [];
    let lastMessageId: string | undefined;
    let previousBatchTailId: string | undefined;
    let iterationCount = 0;
    const MAX_ITERATIONS = 2000;

    try {
      let fetched = 0;
      const maxMessages = 10000;

      while (fetched < maxMessages) {
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
          logger.warn(
            `[BACKUP] Arrêt de la sauvegarde du canal ${channel.name} après ${iterationCount} itérations (boucle potentielle).`
          );
          break;
        }

        const options: any = { limit: 100 };
        if (lastMessageId) {
          options.before = lastMessageId;
        }

        const fetchedBatch = await channel.messages.fetch(options);
        const batch = fetchedBatch instanceof Collection
          ? fetchedBatch
          : new Collection<string, Message<true>>([[fetchedBatch.id, fetchedBatch as Message<true>]]);
        if (batch.size === 0) break;

        let batchTailId: string | undefined;
        for (const message of batch.values()) {
          if (message.author.bot && message.author.id !== channel.client.user?.id) continue;

          const backupMessage: BackupMessage = {
            id: message.id,
            content: message.content,
            authorId: message.author.id,
            authorUsername: message.author.username,
            authorDiscriminator: message.author.discriminator,
            authorAvatar: message.author.displayAvatarURL({ size: 4096 }),
            authorBot: message.author.bot,
            timestamp: message.createdAt.toISOString(),
            editedTimestamp: message.editedTimestamp ? new Date(message.editedTimestamp).toISOString() : null,
            pinned: message.pinned,
            embeds: message.embeds.map((embed: Embed): APIEmbed => embed.toJSON()),
            attachments: [],
            reactions: [],
            mentions: message.mentions.users.map((user: User) => user.id)
          };

          for (const attachment of message.attachments.values()) {
            try {
            const fileName = `${attachment.id}_${attachment.name}`;
            const attachmentPath = join(attachmentsDir, fileName);
              const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
              const buffer = Buffer.from(response.data);
              writeFileSync(attachmentPath, buffer);

              backupMessage.attachments.push({
                id: attachment.id,
                name: attachment.name,
                url: attachment.url,
                proxyUrl: attachment.proxyURL,
                size: attachment.size,
                contentType: attachment.contentType,
                height: attachment.height,
                width: attachment.width,
                ephemeral: attachment.ephemeral,
                description: attachment.description,
              localPath: fileName
              });
            } catch (error) {
              logger.error(`[BACKUP] Erreur lors de la sauvegarde de l'attachment ${attachment.name}:`, error);
            }
          }

          for (const reaction of message.reactions.cache.values()) {
            const users = await reaction.users.fetch();
            backupMessage.reactions.push({
              emoji: reaction.emoji.toString(),
              count: reaction.count,
              users: [...users.values()].map((user: User) => user.id)
            });
          }

          messages.push(backupMessage);
          lastMessageId = message.id;
          batchTailId = message.id;
          fetched++;
        }

        if (!batchTailId || batchTailId === previousBatchTailId) {
          logger.warn(`[BACKUP] Aucune progression sur ${channel.name}. Arrêt anticipé pour éviter une boucle.`);
          break;
        }

        previousBatchTailId = batchTailId;

        if (batch.size < 100) break;
      }
    } catch (error) {
      logger.error(`[BACKUP] Erreur lors de la sauvegarde des messages:`, error);
    }

    return messages.reverse();
  }

  private static async backupWebhooks(guild: Guild): Promise<BackupWebhook[]> {
    const webhooks: BackupWebhook[] = [];

    for (const channel of guild.channels.cache.values()) {
      if (!(channel instanceof TextChannel || channel instanceof ForumChannel)) continue;

      try {
        const channelWebhooks = await channel.fetchWebhooks();
        for (const webhook of channelWebhooks.values()) {
          webhooks.push({
            id: webhook.id,
            name: webhook.name || 'unknown',
            avatar: webhook.avatarURL({ size: 4096 }),
            channelId: webhook.channelId,
            type: webhook.type,
            url: webhook.url
          });
        }
      } catch (error) {
        logger.error(`[BACKUP] Erreur lors de la sauvegarde des webhooks du canal ${channel.name}:`, error);
      }
    }

    return webhooks;
  }

  static async restoreBackup(guild: Guild, backupId: string): Promise<void> {
    logger.info(`[RESTORE] Début de la restauration du backup ${backupId} sur ${guild.name}`);
    const restoreStartedAt = Date.now();
    
    const backupFilePath = join(this.backupsDir, backupId, 'backup.json');
    if (!existsSync(backupFilePath)) {
      throw new Error(`Backup ${backupId} introuvable`);
    }

    const backupData: BackupData = JSON.parse(readFileSync(backupFilePath, 'utf-8'));
    let checkpoint = this.loadCheckpoint(backupId, guild.id);
    if (!checkpoint) {
      checkpoint = this.createCheckpoint(backupId, guild.id);
    }

    const wantsEmojis = this.shouldRestoreEmojis() && backupData.emojis.length > 0;
    const wantsStickers = backupData.stickers.length > 0;
    const preRestoredRoleMap = checkpoint.stages.roles
      ? this.rehydrateRoleMap(guild, checkpoint, backupData.roles)
      : null;
    const preRestoredChannelMap = checkpoint.stages.channels
      ? this.rehydrateChannelMap(guild, checkpoint, backupData.channels)
      : null;

    const rolesReady = preRestoredRoleMap !== null;
    const channelsReady = preRestoredChannelMap !== null;
    const emojisReady = wantsEmojis ? this.verifyEmojiState(guild, backupData.emojis, checkpoint) : true;
    const stickersReady = wantsStickers ? this.verifyStickerState(guild, backupData.stickers, checkpoint) : true;

    await this.resetGuildState(guild, {
      clearChannels: !channelsReady,
      clearRoles: !rolesReady,
      clearEmojis: wantsEmojis && !emojisReady,
      clearStickers: wantsStickers && !stickersReady
    });

    let roleIdMap: Map<string, string> | null = rolesReady && preRestoredRoleMap ? preRestoredRoleMap : null;
    if (roleIdMap) {
      logger.info('[RESTORE] Étape rôles déjà restaurée, vérification réussie.');
    } else {
      logger.info('[RESTORE] Restauration des rôles...');
      checkpoint.stages.roles = false;
      this.persistCheckpoint(checkpoint);
      roleIdMap = await this.restoreRoles(guild, backupData.roles);
      checkpoint.roleMap = Object.fromEntries(roleIdMap);
      checkpoint.stages.roles = true;
      this.persistCheckpoint(checkpoint);
    }

    if (wantsEmojis) {
      if (!emojisReady) {
        logger.info('[RESTORE] Restauration des emojis...');
        checkpoint.stages.emojis = false;
        this.persistCheckpoint(checkpoint);
        await this.restoreEmojis(guild, backupData.emojis, backupId);
        checkpoint.stages.emojis = true;
        this.persistCheckpoint(checkpoint);
      } else {
        logger.info('[RESTORE] Emojis déjà restaurés, étape ignorée.');
      }
    } else if (backupData.emojis.length > 0) {
      logger.info('[RESTORE] Skipping emoji restore (RESTORE_EMOJIS env not enabled)');
    }

    if (wantsStickers) {
      if (!stickersReady) {
        logger.info('[RESTORE] Restauration des stickers...');
        checkpoint.stages.stickers = false;
        this.persistCheckpoint(checkpoint);
        await this.restoreStickers(guild, backupData.stickers, backupId);
        checkpoint.stages.stickers = true;
        this.persistCheckpoint(checkpoint);
      } else {
        logger.info('[RESTORE] Stickers déjà restaurés, étape ignorée.');
      }
    }

    let channelMap: Map<string, GuildBasedChannel> | null =
      channelsReady && preRestoredChannelMap ? preRestoredChannelMap : null;
    if (channelMap) {
      logger.info('[RESTORE] Canaux déjà restaurés, vérification réussie.');
    } else {
      logger.info('[RESTORE] Restauration des canaux...');
      checkpoint.stages.channels = false;
      this.persistCheckpoint(checkpoint);
      channelMap = await this.restoreChannels(guild, backupData.channels, backupId, roleIdMap);
      checkpoint.channelMap = this.serializeChannelMap(channelMap);
      checkpoint.stages.channels = true;
      this.persistCheckpoint(checkpoint);
    }

    if (!roleIdMap) {
      throw new Error('[RESTORE] Impossible de reconstruire la correspondance des rôles.');
    }

    if (!channelMap) {
      throw new Error('[RESTORE] Impossible de reconstruire la correspondance des canaux.');
    }

    const serverSettingsReady =
      checkpoint.stages.serverSettings && this.verifyServerSettingsState(guild, backupData.server, checkpoint);
    if (!serverSettingsReady) {
      logger.info('[RESTORE] Restauration des paramètres du serveur...');
      checkpoint.stages.serverSettings = false;
      this.persistCheckpoint(checkpoint);
      await this.restoreServerSettings(guild, backupData.server, channelMap);
      checkpoint.stages.serverSettings = true;
      this.persistCheckpoint(checkpoint);
    } else {
      logger.info('[RESTORE] Paramètres serveur déjà conformes, étape ignorée.');
    }

    logger.info('[RESTORE] Restauration terminée avec succès');
    await this.sendRestoreSummary(guild, backupData, channelMap, restoreStartedAt);
  }

  private static async restoreRoles(guild: Guild, roles: BackupRole[]): Promise<Map<string, string>> {
    const roleIdMap = new Map<string, string>();
    roleIdMap.set(guild.id, guild.id);

    for (const backupRole of roles.sort((a, b) => a.position - b.position)) {
      try {
        const role = await guild.roles.create({
          name: backupRole.name,
          color: backupRole.color,
          hoist: backupRole.hoist,
          mentionable: backupRole.mentionable,
          permissions: new PermissionsBitField(BigInt(backupRole.permissions)),
          position: backupRole.position,
          reason: 'Restauration du backup'
        });
        await this.delay(this.ROLE_RESTORE_DELAY);
        roleIdMap.set(backupRole.id, role.id);
      } catch (error) {
        logger.error(`[RESTORE] Erreur lors de la restauration du rôle ${backupRole.name}:`, error);
      }
    }

    return roleIdMap;
  }

  private static async restoreEmojis(guild: Guild, emojis: BackupEmoji[], backupId: string): Promise<void> {
    for (const backupEmoji of emojis) {
      try {
        const emojiPath = this.resolveStoredFile(this.emojisDir, backupId, backupEmoji.localPath);
        if (!emojiPath) {
          logger.warn(`[RESTORE] Fichier emoji introuvable pour ${backupEmoji.name}`);
          continue;
        }

        const emojiBuffer = readFileSync(emojiPath);
        await guild.emojis.create({
          attachment: emojiBuffer,
          name: backupEmoji.name,
          reason: 'Restauration du backup'
        });
        await this.delay(this.EMOJI_RESTORE_DELAY);
      } catch (error) {
        logger.error(`[RESTORE] Erreur lors de la restauration de l'emoji ${backupEmoji.name}:`, error);
      }
    }
  }

  private static async restoreStickers(guild: Guild, stickers: BackupSticker[], backupId: string): Promise<void> {
    for (const backupSticker of stickers) {
      try {
        const stickerPath = this.resolveStoredFile(this.stickersDir, backupId, backupSticker.localPath);
        if (!stickerPath) {
          logger.warn(`[RESTORE] Fichier sticker introuvable pour ${backupSticker.name}`);
          continue;
        }

        const stickerBuffer = readFileSync(stickerPath);
        await guild.stickers.create({
          file: stickerBuffer,
          name: backupSticker.name,
          description: backupSticker.description || undefined,
          tags: backupSticker.tags,
          reason: 'Restauration du backup'
        });
        await this.delay(this.STICKER_RESTORE_DELAY);
      } catch (error) {
        logger.error(`[RESTORE] Erreur lors de la restauration du sticker ${backupSticker.name}:`, error);
      }
    }
  }

  private static async restoreChannels(
    guild: Guild,
    channels: BackupChannel[],
    backupId: string,
    roleIdMap: Map<string, string>
  ): Promise<Map<string, GuildBasedChannel>> {
    const channelMap = new Map<string, GuildBasedChannel>();

    const categoryChannels = channels
      .filter(channel => channel.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    for (const category of categoryChannels) {
      try {
        const permissionOverwrites = this.buildPermissionOverwrites(category, roleIdMap);
        const createdCategory = await guild.channels.create({
          name: category.name,
          type: ChannelType.GuildCategory,
          position: category.position,
          permissionOverwrites,
          reason: 'Restauration du backup'
        });
        await this.syncChannelPermissions(createdCategory, category, roleIdMap);
        channelMap.set(category.id, createdCategory);
      } catch (error) {
        logger.error(`[RESTORE] Erreur lors de la restauration de la catégorie ${category.name}:`, error);
      }
    }

    const nonCategoryChannels = channels
      .filter(channel => channel.type !== ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    for (const backupChannel of nonCategoryChannels) {
      try {
        const createdChannel = await this.createChannelFromBackup(
          guild,
          backupChannel,
          roleIdMap,
          channelMap
        );

        if (!createdChannel) {
          continue;
        }

        await this.syncChannelPermissions(createdChannel, backupChannel, roleIdMap);
        channelMap.set(backupChannel.id, createdChannel);

        if (this.isTextualGuildChannel(createdChannel) && backupChannel.messages.length > 0) {
          await this.restoreMessages(createdChannel, backupChannel.messages, backupId);
        }

        if (createdChannel instanceof TextChannel && backupChannel.threads) {
          for (const backupThread of backupChannel.threads) {
            try {
              const thread = await createdChannel.threads.create({
                name: backupThread.name,
                autoArchiveDuration: backupThread.autoArchiveDuration || undefined,
                reason: 'Restauration du backup'
              });

              if (backupThread.messages.length > 0) {
                await this.restoreMessages(thread, backupThread.messages, backupId);
              }
            } catch (error) {
              logger.error(`[RESTORE] Erreur lors de la restauration du thread ${backupThread.name}:`, error);
            }
          }
        }
      } catch (error) {
        logger.error(`[RESTORE] Erreur lors de la restauration du canal ${backupChannel.name}:`, error);
      }
    }

    await this.applyChannelOrdering(channels, channelMap);
    await this.enforceAllChannelPermissions(channels, channelMap, roleIdMap);
    return channelMap;
  }

  private static buildPermissionOverwrites(
    backupChannel: BackupChannel,
    roleIdMap: Map<string, string>
  ) {
    return backupChannel.permissionOverwrites.map(overwrite => {
      const referenceId =
        overwrite.type === OverwriteType.Role ? roleIdMap.get(overwrite.id) ?? overwrite.id : overwrite.id;
      return {
        id: referenceId,
        type: overwrite.type,
        allow: new PermissionsBitField(BigInt(overwrite.allow)),
        deny: new PermissionsBitField(BigInt(overwrite.deny))
      };
    });
  }

  private static async syncChannelPermissions(
    channel: GuildBasedChannel,
    backupChannel: BackupChannel,
    roleIdMap: Map<string, string>
  ): Promise<void> {
    if (!('permissionOverwrites' in channel)) {
      return;
    }

    const overwrites = this.buildPermissionOverwrites(backupChannel, roleIdMap).map(overwrite => ({
      id: overwrite.id,
      allow: overwrite.allow,
      deny: overwrite.deny,
      type: overwrite.type
    }));

    try {
      await channel.permissionOverwrites.set(overwrites);
    } catch (error) {
      const label = (channel as { name?: string }).name ?? channel.id;
      logger.warn(`[RESTORE] Impossible d'appliquer les permissions pour ${label}:`, error);
    }
  }

  private static async enforceAllChannelPermissions(
    channels: BackupChannel[],
    channelMap: Map<string, GuildBasedChannel>,
    roleIdMap: Map<string, string>
  ): Promise<void> {
    for (const backupChannel of channels) {
      const channel = channelMap.get(backupChannel.id);
      if (!channel) {
        continue;
      }
      await this.syncChannelPermissions(channel, backupChannel, roleIdMap);
      await this.delay(100);
    }
  }

  private static async createChannelFromBackup(
    guild: Guild,
    backupChannel: BackupChannel,
    roleIdMap: Map<string, string>,
    channelMap: Map<string, GuildBasedChannel>
  ): Promise<GuildBasedChannel | null> {
    const parentChannel = backupChannel.parentId ? channelMap.get(backupChannel.parentId) : undefined;
    const parentId = parentChannel instanceof CategoryChannel ? parentChannel.id : undefined;
    const permissionOverwrites = this.buildPermissionOverwrites(backupChannel, roleIdMap);

    const options: any = {
      name: backupChannel.name,
      type: backupChannel.type,
      position: backupChannel.position,
      parent: parentId,
      permissionOverwrites,
      reason: 'Restauration du backup'
    };

    switch (backupChannel.type) {
      case ChannelType.GuildText:
      case ChannelType.GuildAnnouncement:
        options.topic = backupChannel.topic || undefined;
        options.nsfw = backupChannel.nsfw;
        options.rateLimitPerUser = backupChannel.rateLimitPerUser || undefined;
        break;
      case ChannelType.GuildVoice:
      case ChannelType.GuildStageVoice:
        options.bitrate = backupChannel.bitrate || undefined;
        options.userLimit = backupChannel.userLimit || undefined;
        break;
      case ChannelType.GuildForum:
        options.nsfw = backupChannel.nsfw;
        options.topic = backupChannel.topic || undefined;
        break;
      default:
        options.type = ChannelType.GuildText;
        options.topic = backupChannel.topic || undefined;
        options.nsfw = backupChannel.nsfw;
        options.rateLimitPerUser = backupChannel.rateLimitPerUser || undefined;
        break;
    }

    const createdChannel = await guild.channels.create(options);

    if (parentId && 'setParent' in createdChannel && createdChannel.parentId !== parentId) {
      await (createdChannel as TextChannel | VoiceChannel | ForumChannel | StageChannel).setParent(parentId);
    }

    return createdChannel;
  }

  private static isTextualGuildChannel(channel: GuildBasedChannel): channel is TextChannel | NewsChannel {
    return channel instanceof TextChannel || channel instanceof NewsChannel;
  }

  private static async applyChannelOrdering(
    channels: BackupChannel[],
    channelMap: Map<string, GuildBasedChannel>
  ): Promise<void> {
    const categories = channels
      .filter(channel => channel.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    for (const category of categories) {
      const channel = channelMap.get(category.id);
      if (channel && 'setPosition' in channel) {
        await (channel as CategoryChannel).setPosition(category.position);
      }
    }

    const rootChannels = channels
      .filter(channel => channel.type !== ChannelType.GuildCategory && !channel.parentId)
      .sort((a, b) => a.position - b.position);

    for (const rootChannel of rootChannels) {
      const channel = channelMap.get(rootChannel.id);
      if (channel && 'setPosition' in channel) {
        await (channel as TextChannel | VoiceChannel | ForumChannel | NewsChannel | StageChannel).setPosition(
          rootChannel.position
        );
      }
    }

    const grouped = new Map<string, BackupChannel[]>();
    for (const channel of channels) {
      if (channel.type === ChannelType.GuildCategory || !channel.parentId) {
        continue;
      }
      const collection = grouped.get(channel.parentId) ?? [];
      collection.push(channel);
      grouped.set(channel.parentId, collection);
    }

    for (const [parentId, siblings] of grouped.entries()) {
      const sortedSiblings = siblings.sort((a, b) => a.position - b.position);
      for (const sibling of sortedSiblings) {
        const channel = channelMap.get(sibling.id);
        if (channel && 'setPosition' in channel) {
          await (channel as TextChannel | VoiceChannel | ForumChannel | NewsChannel | StageChannel).setPosition(
            sibling.position
          );
        }
      }
    }
  }

  private static async restoreMessages(
    channel: TextChannel | ThreadChannel | NewsChannel,
    messages: BackupMessage[],
    backupId: string
  ): Promise<void> {
    for (const backupMessage of messages) {
      const sanitizedContent =
        backupMessage.content && backupMessage.content.length > 0 ? backupMessage.content : undefined;
      const embedPayloads = (backupMessage.embeds || []).slice(0, 10);
      const isUserMessage = !backupMessage.authorBot;
      const embedsToSend = isUserMessage
        ? [this.buildUserMessageEmbed(backupMessage), ...embedPayloads].slice(0, 10)
        : embedPayloads;

      const baseOptions: any = {};
      if (!isUserMessage && sanitizedContent) {
        baseOptions.content = sanitizedContent;
      }
      if (embedsToSend.length > 0) {
        baseOptions.embeds = embedsToSend;
      }

      const preparedAttachments = this.prepareMessageAttachments(backupMessage, backupId);
      const attachmentChunks = this.chunkAttachments(preparedAttachments);
      const firstChunk = attachmentChunks.shift();
      if (firstChunk && firstChunk.length > 0) {
        baseOptions.files = firstChunk.map(attachment => attachment.builder);
      }
      if (
        !baseOptions.content &&
        (!baseOptions.embeds || baseOptions.embeds.length === 0) &&
        (!baseOptions.files || baseOptions.files.length === 0)
      ) {
        baseOptions.content = this.buildEmptyMessagePlaceholder(backupMessage);
      }

      const baseSent = await this.trySendMessage(channel, baseOptions, firstChunk ?? null, backupMessage);
      if (!baseSent) {
        continue;
      }

      if (attachmentChunks.length > 0) {
        for (const chunk of attachmentChunks) {
          const followUpPayload = {
            content: this.buildAttachmentFollowUpContent(backupMessage),
            files: chunk.map(attachment => attachment.builder)
          };
          const followUpSent = await this.trySendMessage(channel, followUpPayload, chunk, backupMessage);
          if (!followUpSent) {
            continue;
          }
          await this.delay(500);
        }
      }

      await this.delay(1000);
    }
  }

  private static buildUserMessageEmbed(message: BackupMessage): APIEmbed {
    const discriminator =
      message.authorDiscriminator && message.authorDiscriminator !== '0'
        ? `#${message.authorDiscriminator}`
        : '';
    const hasContent = message.content && message.content.trim().length > 0;
    const embed: APIEmbed = {
      author: {
        name: `${message.authorUsername}${discriminator}`,
        icon_url: message.authorAvatar || undefined
      },
      description: hasContent ? message.content : '*No content*',
      color: 0x5865f2,
      timestamp: message.timestamp,
      footer: {
        text: `User ID: ${message.authorId}`
      }
    };

    const fields: { name: string; value: string; inline?: boolean }[] = [];
    if (message.editedTimestamp) {
      fields.push({
        name: 'Edited',
        value: new Date(message.editedTimestamp).toISOString()
      });
    }

    if (message.attachments.length > 0) {
      const listed = message.attachments.slice(0, 5).map(attachment => `• ${attachment.name}`).join('\n');
      const overflow = message.attachments.length > 5 ? `\n• ${message.attachments.length - 5} more file(s)` : '';
      fields.push({
        name: 'Attachments',
        value: `${listed}${overflow}`
      });
    }

    if (fields.length > 0) {
      embed.fields = fields;
    }

    return embed;
  }

  private static prepareMessageAttachments(backupMessage: BackupMessage, backupId: string): PreparedAttachment[] {
    const prepared: PreparedAttachment[] = [];

    const limitBytes = this.getAttachmentLimitBytes();
    for (const attachment of backupMessage.attachments) {
      const attachmentPath = this.resolveStoredFile(this.attachmentsDir, backupId, attachment.localPath);
      if (!attachmentPath) {
        logger.warn(`[RESTORE] Fichier attachment introuvable: ${attachment.name}`);
        continue;
      }

      try {
        const stats = statSync(attachmentPath);
        const fileSize = stats.size;
        if (fileSize > limitBytes) {
          const sizeMb = (fileSize / (1024 * 1024)).toFixed(2);
          logger.warn(
            `[RESTORE] Attachment ${attachment.name} ignoré (${sizeMb}MB > limite de ${this.getAttachmentLimitMb().toFixed(
              1
            )}MB)`
          );
          continue;
        }
        const fileBuffer = readFileSync(attachmentPath);

        prepared.push({
          builder: new AttachmentBuilder(fileBuffer, { name: attachment.name }),
          size: fileSize,
          name: attachment.name
        });
      } catch (error) {
        logger.error(`[RESTORE] Impossible de charger l'attachment ${attachment.name}:`, error);
      }
    }

    return prepared;
  }

  private static chunkAttachments(attachments: PreparedAttachment[]): PreparedAttachment[][] {
    return attachments.map(attachment => [attachment]);
  }

  private static buildAttachmentFollowUpContent(message: BackupMessage): string {
    return `📎 Backup attachment from ${message.authorUsername} (${message.authorId})`;
  }

  private static buildEmptyMessagePlaceholder(message: BackupMessage): string {
    return `Restored message ${message.id} had no visible content.`;
  }

  private static async trySendMessage(
    channel: TextChannel | ThreadChannel | NewsChannel,
    payload: any,
    attachmentChunk: PreparedAttachment[] | null,
    message: BackupMessage
  ): Promise<boolean> {
    try {
      await channel.send(payload);
      return true;
    } catch (error) {
      if (this.isRequestEntityTooLarge(error)) {
        if (attachmentChunk && attachmentChunk.length > 0) {
          for (const attachment of attachmentChunk) {
            const sizeMb = (attachment.size / (1024 * 1024)).toFixed(2);
            logger.warn(
              `[RESTORE] Attachment ${attachment.name} (${sizeMb}MB) ignoré: limite Discord (${this
                .getAttachmentLimitMb()
                .toFixed(1)}MB)`
            );
          }
          await this.notifyAttachmentSkip(channel, attachmentChunk, message);
        } else {
          logger.warn(`[RESTORE] Message ${message.id} ignoré car Discord rejette la taille de la requête.`);
        }
        return false;
      }

      if (this.isEmptyMessageError(error)) {
        logger.warn(`[RESTORE] Message ${message.id} ignoré car Discord refuse les messages vides.`);
        return false;
      }

      logger.error(
        `[RESTORE] Erreur lors de la restauration du message ${message.id}: ${this.describeDiscordError(error)}`
      );
      return false;
    }
  }

  private static isRequestEntityTooLarge(error: unknown): boolean {
    if (error instanceof DiscordAPIError) {
      return error.code === 40005 || error.status === 413;
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as any).code;
      return code === 40005 || code === 413;
    }
    return false;
  }

  private static isEmptyMessageError(error: unknown): boolean {
    if (error instanceof DiscordAPIError) {
      return error.code === 50006;
    }
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as any).code === 50006;
    }
    return false;
  }

  private static describeDiscordError(error: unknown): string {
    if (!error) {
      return 'Erreur inconnue';
    }
    if (error instanceof DiscordAPIError) {
      return `${error.message} (code ${error.code})`;
    }
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    if (typeof error === 'object' && 'rawError' in error) {
      const raw = (error as any).rawError;
      if (raw && raw.message) {
        return `${raw.message}${raw.code ? ` (code ${raw.code})` : ''}`;
      }
    }
    return String(error);
  }

  private static async notifyAttachmentSkip(
    channel: TextChannel | ThreadChannel | NewsChannel,
    attachments: PreparedAttachment[],
    message: BackupMessage
  ): Promise<void> {
    const limitLabel = this.getAttachmentLimitMb().toFixed(1);
    const lines = attachments
      .map(attachment => `• ${attachment.name} (${(attachment.size / (1024 * 1024)).toFixed(2)}MB)`)
      .join('\n');
    const content = `⚠️ Attachment(s) skipped for ${message.authorUsername} (${message.authorId}) because they exceed the upload limit (${limitLabel}MB):\n${lines}`;
    await channel.send({ content }).catch(() => {});
  }

  private static async restoreServerSettings(
    guild: Guild,
    server: BackupData['server'],
    channelMap: Map<string, GuildBasedChannel>
  ): Promise<void> {
    try {
      await guild.setName(server.name, 'Restauration du backup');
      if (server.icon) {
        const iconResponse = await axios.get(server.icon, { responseType: 'arraybuffer' });
        const iconBuffer = Buffer.from(iconResponse.data);
        await guild.setIcon(iconBuffer, 'Restauration du backup');
      }
      if (server.banner) {
        const bannerResponse = await axios.get(server.banner, { responseType: 'arraybuffer' });
        const bannerBuffer = Buffer.from(bannerResponse.data);
        await guild.setBanner(bannerBuffer, 'Restauration du backup');
      }
      const resolveTextChannelId = (channelId: string | null) => {
        if (!channelId) {
          return null;
        }
        const channel = channelMap.get(channelId);
        if (!channel) {
          return null;
        }
        if (channel instanceof TextChannel || channel instanceof NewsChannel) {
          return channel.id;
        }
        return null;
      };

      const resolveVoiceChannelId = (channelId: string | null) => {
        if (!channelId) {
          return null;
        }
        const channel = channelMap.get(channelId);
        if (!channel) {
          return null;
        }
        if (channel instanceof VoiceChannel || channel instanceof StageChannel) {
          return channel.id;
        }
        return null;
      };

      await guild.edit({
        description: server.description || undefined,
        verificationLevel: server.verificationLevel,
        explicitContentFilter: server.explicitContentFilter,
        defaultMessageNotifications: server.defaultMessageNotifications,
        systemChannel: resolveTextChannelId(server.systemChannelId),
        rulesChannel: resolveTextChannelId(server.rulesChannelId),
        publicUpdatesChannel: resolveTextChannelId(server.publicUpdatesChannelId),
        afkChannel: resolveVoiceChannelId(server.afkChannelId),
        afkTimeout: server.afkTimeout
      });
    } catch (error) {
      logger.error(`[RESTORE] Erreur lors de la restauration des paramètres du serveur:`, error);
    }
  }

  private static async sendRestoreSummary(
    guild: Guild,
    backupData: BackupData,
    channelMap: Map<string, GuildBasedChannel>,
    startedAt: number
  ): Promise<void> {
    const moderatorChannel = this.findModeratorChannel(guild, backupData.channels, channelMap);
    if (!moderatorChannel) {
      logger.warn('[RESTORE] Impossible de trouver le canal moderator-only pour envoyer le récapitulatif.');
      return;
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const totalMessages = this.calculateTotalMessages(backupData.channels);

    const embed = new EmbedBuilder()
      .setTitle('📦 Backup restauré')
      .setDescription(`La sauvegarde \`${backupData.id}\` a été restaurée sur **${guild.name}**.`)
      .addFields(
        { name: 'Durée', value: `${durationSeconds}s (~${(durationSeconds / 60).toFixed(1)} min)`, inline: true },
        { name: 'Rôles', value: `${backupData.roles.length}`, inline: true },
        { name: 'Salons', value: `${backupData.channels.length}`, inline: true },
        { name: 'Messages', value: `${totalMessages}`, inline: true }
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await moderatorChannel.send({ embeds: [embed] }).catch(error => {
      logger.error('[RESTORE] Impossible d\'envoyer le récapitulatif dans moderator-only:', error);
    });
  }

  private static findModeratorChannel(
    guild: Guild,
    backupChannels: BackupChannel[],
    channelMap: Map<string, GuildBasedChannel>
  ): (TextChannel | NewsChannel) | null {
    const target = backupChannels.find(channel => channel.name.toLowerCase() === 'moderator-only');
    if (target) {
      const mapped = channelMap.get(target.id);
      if (this.isSendableTextChannel(mapped)) {
        return mapped;
      }
    }

    const fallback = guild.channels.cache.find(
      channel =>
        this.isSendableTextChannel(channel as GuildBasedChannel) &&
        (channel as GuildBasedChannel).name?.toLowerCase() === 'moderator-only'
    );
    return (fallback as TextChannel | NewsChannel | null) ?? null;
  }

  private static isSendableTextChannel(
    channel: GuildBasedChannel | null | undefined
  ): channel is TextChannel | NewsChannel {
    if (!channel) {
      return false;
    }
    return channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;
  }

  private static calculateTotalMessages(channels: BackupChannel[]): number {
    return channels.reduce((sum, channel) => {
      const base = channel.messages.length;
      const threadMessages = channel.threads?.reduce((threadSum, thread) => threadSum + thread.messages.length, 0) ?? 0;
      return sum + base + threadMessages;
    }, 0);
  }

  static listBackups(): string[] {
    if (!existsSync(this.backupsDir)) {
      return [];
    }

    return readdirSync(this.backupsDir)
      .filter(dir => {
        const backupPath = join(this.backupsDir, dir, 'backup.json');
        return existsSync(backupPath);
      })
      .sort((a, b) => {
        const aPath = join(this.backupsDir, a, 'backup.json');
        const bPath = join(this.backupsDir, b, 'backup.json');
        const aData = JSON.parse(readFileSync(aPath, 'utf-8'));
        const bData = JSON.parse(readFileSync(bPath, 'utf-8'));
        return new Date(bData.createdAt).getTime() - new Date(aData.createdAt).getTime();
      });
  }

  static getBackupInfo(backupId: string): BackupData | null {
    const backupFilePath = join(this.backupsDir, backupId, 'backup.json');
    if (!existsSync(backupFilePath)) {
      return null;
    }

    return JSON.parse(readFileSync(backupFilePath, 'utf-8'));
  }

  static deleteBackup(backupId: string): void {
    const backupDir = join(this.backupsDir, backupId);
    if (existsSync(backupDir)) {
      const files = readdirSync(backupDir);
      for (const file of files) {
        unlinkSync(join(backupDir, file));
      }
      // Note: La suppression récursive complète nécessiterait une fonction supplémentaire
    }
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static async resetGuildState(guild: Guild, options: ResetOptions): Promise<void> {
    const { clearChannels, clearRoles, clearEmojis, clearStickers } = options;
    if (!clearChannels && !clearRoles && !clearEmojis && !clearStickers) {
      logger.info('[RESTORE] Aucun nettoyage nécessaire avant la restauration.');
      return;
    }

    logger.info(
      `[RESTORE] Nettoyage du serveur cible (channels=${clearChannels}, roles=${clearRoles}, emojis=${clearEmojis}, stickers=${clearStickers})`
    );

    if (clearChannels) {
      await guild.channels.fetch();
      await this.clearChannels(guild);
    }

    if (clearRoles) {
      await guild.roles.fetch();
      await this.clearRoles(guild);
    }

    if (clearEmojis) {
      await guild.emojis.fetch();
      await this.clearEmojis(guild);
    }

    if (clearStickers) {
      await guild.stickers.fetch();
      await this.clearStickers(guild);
    }
  }

  private static loadCheckpoint(backupId: string, guildId: string): RestoreCheckpoint | null {
    const checkpointPath = this.getCheckpointPath(backupId);
    if (!existsSync(checkpointPath)) {
      return null;
    }

    try {
      const checkpoint: RestoreCheckpoint = JSON.parse(readFileSync(checkpointPath, 'utf-8'));
      if (checkpoint.backupId !== backupId || checkpoint.guildId !== guildId) {
        return null;
      }
      checkpoint.stages = { ...this.DEFAULT_CHECKPOINT, ...checkpoint.stages };
      return checkpoint;
    } catch (error) {
      logger.error(`[RESTORE] Impossible de lire le checkpoint du backup ${backupId}:`, error);
      return null;
    }
  }

  private static createCheckpoint(backupId: string, guildId: string): RestoreCheckpoint {
    const checkpoint: RestoreCheckpoint = {
      backupId,
      guildId,
      stages: { ...this.DEFAULT_CHECKPOINT },
      updatedAt: new Date().toISOString()
    };
    this.persistCheckpoint(checkpoint);
    return checkpoint;
  }

  private static persistCheckpoint(checkpoint: RestoreCheckpoint): void {
    checkpoint.updatedAt = new Date().toISOString();
    const checkpointPath = this.getCheckpointPath(checkpoint.backupId);
    const directory = join(this.backupsDir, checkpoint.backupId);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
    writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  private static getCheckpointPath(backupId: string): string {
    return join(this.backupsDir, backupId, 'restore-checkpoint.json');
  }

  private static rehydrateRoleMap(
    guild: Guild,
    checkpoint: RestoreCheckpoint,
    roles: BackupRole[]
  ): Map<string, string> | null {
    if (!checkpoint.roleMap) {
      return null;
    }

    const map = new Map<string, string>();
    for (const role of roles) {
      const storedId = checkpoint.roleMap[role.id];
      if (!storedId) {
        return null;
      }
      if (!guild.roles.cache.has(storedId)) {
        return null;
      }
      map.set(role.id, storedId);
    }
    map.set(guild.id, guild.id);
    return map;
  }

  private static rehydrateChannelMap(
    guild: Guild,
    checkpoint: RestoreCheckpoint,
    channels: BackupChannel[]
  ): Map<string, GuildBasedChannel> | null {
    if (!checkpoint.channelMap) {
      return null;
    }

    const map = new Map<string, GuildBasedChannel>();
    for (const channel of channels) {
      const storedId = checkpoint.channelMap[channel.id];
      if (!storedId) {
        return null;
      }
      const guildChannel = guild.channels.cache.get(storedId);
      if (!guildChannel) {
        return null;
      }
      map.set(channel.id, guildChannel);
    }
    return map;
  }

  private static serializeChannelMap(channelMap: Map<string, GuildBasedChannel>): Record<string, string> {
    const serialized: Record<string, string> = {};
    for (const [backupChannelId, guildChannel] of channelMap.entries()) {
      serialized[backupChannelId] = guildChannel.id;
    }
    return serialized;
  }

  private static verifyEmojiState(guild: Guild, emojis: BackupEmoji[], checkpoint: RestoreCheckpoint): boolean {
    if (!checkpoint.stages.emojis) {
      return false;
    }
    if (emojis.length === 0) {
      return true;
    }
    return guild.emojis.cache.size >= emojis.length;
  }

  private static verifyStickerState(guild: Guild, stickers: BackupSticker[], checkpoint: RestoreCheckpoint): boolean {
    if (!checkpoint.stages.stickers) {
      return false;
    }
    if (stickers.length === 0) {
      return true;
    }
    return guild.stickers.cache.size >= stickers.length;
  }

  private static verifyServerSettingsState(
    guild: Guild,
    server: BackupData['server'],
    checkpoint: RestoreCheckpoint
  ): boolean {
    const map = checkpoint.channelMap;
    const resolveChannelId = (backupChannelId: string | null): string | null => {
      if (!backupChannelId || !map) {
        return null;
      }
      return map[backupChannelId] || null;
    };

    const systemChannelId = resolveChannelId(server.systemChannelId);
    const rulesChannelId = resolveChannelId(server.rulesChannelId);
    const publicUpdatesChannelId = resolveChannelId(server.publicUpdatesChannelId);
    const afkChannelId = resolveChannelId(server.afkChannelId);

    return (
      guild.name === server.name &&
      guild.verificationLevel === server.verificationLevel &&
      guild.explicitContentFilter === server.explicitContentFilter &&
      guild.defaultMessageNotifications === server.defaultMessageNotifications &&
      (guild.systemChannelId || null) === (systemChannelId || null) &&
      (guild.rulesChannelId || null) === (rulesChannelId || null) &&
      (guild.publicUpdatesChannelId || null) === (publicUpdatesChannelId || null) &&
      (guild.afkChannelId || null) === (afkChannelId || null) &&
      guild.afkTimeout === server.afkTimeout
    );
  }

  private static async clearChannels(guild: Guild): Promise<void> {
    const channels = [...guild.channels.cache.values()];
    const nonCategory = channels.filter(channel => channel.type !== ChannelType.GuildCategory);
    const categories = channels.filter(channel => channel.type === ChannelType.GuildCategory);
    const ordered = [...nonCategory, ...categories];

    for (const channel of ordered) {
      const channelLabel = channel.name ?? channel.id;
      try {
        if ('deletable' in channel && !(channel as any).deletable) {
          logger.warn(`[RESTORE] Canal ${channelLabel} non supprimable (permissions insuffisantes).`);
          continue;
        }
        await channel.delete('Nettoyage avant restauration du backup');
        await this.delay(200);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`[RESTORE] Impossible de supprimer le canal ${channelLabel}: ${errorMessage}`);
      }
    }

    await guild.channels.fetch();
    if (guild.channels.cache.size > 0) {
      const remainingLabels = [...guild.channels.cache.values()].map(channel => channel.name ?? channel.id).join(', ');
      throw new Error(`Impossible de supprimer ${guild.channels.cache.size} salon(s): ${remainingLabels}`);
    }
  }

  private static async clearRoles(guild: Guild): Promise<void> {
    const roles = [...guild.roles.cache.values()]
      .filter(role => role.id !== guild.id && !role.managed)
      .sort((a, b) => b.position - a.position);
    const undeletedRoles: string[] = [];

    for (const role of roles) {
      try {
        if (this.ROLE_DELETE_EXCLUSIONS.has(role.name)) {
          logger.info(`[RESTORE] Conservation du rôle exclu ${role.name}`);
          continue;
        }
        if (!role.editable) {
          undeletedRoles.push(role.name);
          continue;
        }
        await role.delete('Nettoyage avant restauration du backup');
        await this.delay(this.ROLE_RESTORE_DELAY);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`[RESTORE] Impossible de supprimer le rôle ${role.name}: ${errorMessage}`);
        undeletedRoles.push(role.name);
      }
    }

    if (undeletedRoles.length > 0) {
      throw new Error(`Certains rôles n'ont pas pu être supprimés: ${undeletedRoles.join(', ')}`);
    }
  }

  private static async clearEmojis(guild: Guild): Promise<void> {
    const failedEmojis: string[] = [];
    for (const emoji of guild.emojis.cache.values()) {
      try {
        await emoji.delete('Nettoyage avant restauration du backup');
        await this.delay(500);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`[RESTORE] Impossible de supprimer l'emoji ${emoji.name}: ${errorMessage}`);
        failedEmojis.push(emoji.name || emoji.id);
      }
    }

    if (failedEmojis.length > 0) {
      throw new Error(`Certains emojis n'ont pas pu être supprimés: ${failedEmojis.join(', ')}`);
    }
  }

  private static async clearStickers(guild: Guild): Promise<void> {
    const failedStickers: string[] = [];
    for (const sticker of guild.stickers.cache.values()) {
      try {
        await sticker.delete('Nettoyage avant restauration du backup');
        await this.delay(this.STICKER_RESTORE_DELAY);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`[RESTORE] Impossible de supprimer le sticker ${sticker.name}: ${errorMessage}`);
        failedStickers.push(sticker.name || sticker.id);
      }
    }

    if (failedStickers.length > 0) {
      throw new Error(`Certains stickers n'ont pas pu être supprimés: ${failedStickers.join(', ')}`);
    }
  }

  private static resolveStoredFile(baseDir: string, backupId: string, storedPath?: string | null): string | null {
    if (!storedPath) {
      return null;
    }

    if (existsSync(storedPath)) {
      return storedPath;
    }

    const candidateWithId = join(baseDir, backupId, storedPath);
    if (existsSync(candidateWithId)) {
      return candidateWithId;
    }

    const candidate = join(baseDir, storedPath);
    if (existsSync(candidate)) {
      return candidate;
    }

    return null;
  }

  private static shouldRestoreEmojis(): boolean {
    return process.env.RESTORE_EMOJIS === 'true' || process.env.BACKUP_RESTORE_EMOJIS === 'true';
  }
}

function isBackupEligibleChannel(
  channel: unknown
): channel is TextChannel | VoiceChannel | CategoryChannel | ForumChannel {
  return (
    channel instanceof TextChannel ||
    channel instanceof VoiceChannel ||
    channel instanceof CategoryChannel ||
    channel instanceof ForumChannel
  );
}
