import { Client, TextChannel, EmbedBuilder, Webhook, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient } from 'discord.js';
import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';

export interface VerificationWebhookData {
  userId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  guildId: string;
}

export class WebhookManager {
  private static client: Client | null = null;
  private static databaseManager: DatabaseManager = new DatabaseManager();
  private static webhookCache: Map<string, Webhook> = new Map();

  static async initialize(client: Client) {
    WebhookManager.client = client;
  }

  static async getOrCreateWebhook(guildId: string, channelId: string): Promise<Webhook | null> {
    if (!WebhookManager.client) return null;

    const cacheKey = `${guildId}-${channelId}`;
    if (WebhookManager.webhookCache.has(cacheKey)) {
      return WebhookManager.webhookCache.get(cacheKey)!;
    }

    try {
      const guild = WebhookManager.client.guilds.cache.get(guildId);
      if (!guild) return null;

      const channel = guild.channels.cache.get(channelId) as TextChannel;
      if (!channel || !channel.isTextBased()) return null;

      const webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(w => w.name === 'Emynona Verification' && w.owner?.id === WebhookManager.client?.user?.id);

      if (!webhook) {
        webhook = await channel.createWebhook({
          name: 'Emynona Verification',
          avatar: WebhookManager.client?.user?.displayAvatarURL(),
        });
        logger.info(`Webhook créé dans ${channel.name} (${guild.name})`);
      }

      WebhookManager.webhookCache.set(cacheKey, webhook);
      return webhook;
    } catch (error) {
      logger.error('Erreur lors de la création/récupération du webhook:', error);
      return null;
    }
  }

  static async sendVerificationRequest(data: VerificationWebhookData): Promise<boolean> {
    if (!WebhookManager.client) return false;

    try {
      const config = WebhookManager.databaseManager.getServerConfig(data.guildId);
      if (!config) {
        logger.warn(`Configuration non trouvée pour le serveur ${data.guildId}`);
        return false;
      }

      let webhook: Webhook | WebhookClient | null = null;

      if (config.webhookUrl) {
        try {
          webhook = new WebhookClient({ url: config.webhookUrl });
          logger.info('Utilisation du webhook existant configuré');
        } catch (error) {
          logger.error('Erreur lors de la création du WebhookClient:', error);
          return false;
        }
      } else if (config.verificationChannelId) {
        webhook = await WebhookManager.getOrCreateWebhook(data.guildId, config.verificationChannelId);
        if (!webhook) {
          logger.error('Impossible de créer/récupérer le webhook');
          return false;
        }
      } else {
        logger.warn(`Aucun webhook ou canal de vérification configuré pour le serveur ${data.guildId}`);
        return false;
      }

      const guild = WebhookManager.client.guilds.cache.get(data.guildId);
      if (!guild) return false;

      const user = await WebhookManager.client.users.fetch(data.userId).catch(() => null);
      if (!user) return false;

      const embed = new EmbedBuilder()
        .setTitle('🔐 Demande de Vérification')
        .setDescription(`${user} souhaite être vérifié sur le serveur.`)
        .addFields(
          { name: '👤 Utilisateur', value: `${user.tag}`, inline: true },
          { name: '🆔 ID', value: user.id, inline: true },
          { name: '📅 Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: '🌐 Méthode', value: 'OAuth2 Web', inline: true },
          { name: '⏰ Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setColor('#5865F2')
        .setFooter({ 
          text: '€mynona Market • Cliquez sur les boutons pour vérifier',
          iconURL: guild.iconURL() || undefined
        })
        .setTimestamp();

      const acceptButton = new ButtonBuilder()
        .setCustomId(`verify_accept_${data.userId}`)
        .setLabel('✅ Vérifier')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`verify_reject_${data.userId}`)
        .setLabel('❌ Refuser')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(acceptButton, rejectButton);

      await webhook.send({
        embeds: [embed],
        components: [row]
      });

      logger.info(`Demande de vérification envoyée via webhook pour ${user.tag} (${user.id})`);
      return true;
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la demande de vérification:', error);
      return false;
    }
  }

  static async sendVerificationSuccess(data: VerificationWebhookData): Promise<boolean> {
    if (!WebhookManager.client) return false;

    try {
      const config = WebhookManager.databaseManager.getServerConfig(data.guildId);
      if (!config) return false;

      let webhook: Webhook | WebhookClient | null = null;

      if (config.webhookUrl) {
        try {
          webhook = new WebhookClient({ url: config.webhookUrl });
        } catch (error) {
          logger.error('Erreur lors de la création du WebhookClient:', error);
          return false;
        }
      } else if (config.verificationChannelId) {
        webhook = await WebhookManager.getOrCreateWebhook(data.guildId, config.verificationChannelId);
        if (!webhook) return false;
      } else {
        return false;
      }

      const guild = WebhookManager.client.guilds.cache.get(data.guildId);
      if (!guild) return false;

      const user = await WebhookManager.client.users.fetch(data.userId).catch(() => null);
      if (!user) return false;

      const embed = new EmbedBuilder()
        .setTitle('✅ Vérification Approuvée')
        .setDescription(`${user} a été vérifié avec succès !`)
        .addFields(
          { name: '👤 Utilisateur', value: `${user.tag}`, inline: true },
          { name: '🆔 ID', value: user.id, inline: true },
          { name: '✅ Statut', value: 'Vérifié', inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setColor('#00ff00')
        .setTimestamp();

      await webhook.send({ embeds: [embed] });
      return true;
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la confirmation de vérification:', error);
      return false;
    }
  }
}

