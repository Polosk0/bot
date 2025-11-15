import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
  type InteractionReplyOptions,
  type InteractionEditReplyOptions
} from 'discord.js';
import { Command } from '../../types/command';
import { BackupManager } from '../../managers/backupManager';
import { LogManager } from '../../managers/logManager';
import { logger } from '../../utils/logger';

export const backup: Command = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Gérer les sauvegardes du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Créer une sauvegarde complète du serveur')
        .addBooleanOption(option =>
          option
            .setName('messages')
            .setDescription('Inclure les messages dans la sauvegarde (défaut: true)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('restore')
        .setDescription('Restaurer une sauvegarde sur ce serveur')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('ID de la sauvegarde à restaurer')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lister toutes les sauvegardes disponibles')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Afficher les informations d\'une sauvegarde')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('ID de la sauvegarde')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Supprimer une sauvegarde')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('ID de la sauvegarde à supprimer')
            .setRequired(true)
        )
    ),
  category: 'moderation',

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'create':
          await handleCreate(interaction);
          break;
        case 'restore':
          await handleRestore(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        case 'info':
          await handleInfo(interaction);
          break;
        case 'delete':
          await handleDelete(interaction);
          break;
      }
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de la commande backup ${subcommand}:`, error);
      await interaction.reply({
        content: `❌ Une erreur est survenue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const includeMessages = interaction.options.getBoolean('messages') ?? true;
    const guild = interaction.guild!;

    const embed = new EmbedBuilder()
      .setTitle('💾 Création de la sauvegarde')
      .setDescription('La sauvegarde est en cours de création. Cela peut prendre plusieurs minutes...')
      .setColor('#5865F2')
      .setFooter({ text: '€mynona Market • Système de backup' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    try {
      const backupData = await BackupManager.createBackup(
        guild,
        interaction.user.id,
        includeMessages
      );

      const totalMessages = backupData.channels.reduce((sum, channel) => {
        return sum + channel.messages.length + (channel.threads?.reduce((tSum, thread) => tSum + thread.messages.length, 0) || 0);
      }, 0);

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Sauvegarde créée avec succès')
        .setDescription(`La sauvegarde **${backupData.id}** a été créée avec succès.`)
        .addFields(
          { name: '🆔 ID', value: `\`${backupData.id}\``, inline: true },
          { name: '📅 Date', value: `<t:${Math.floor(new Date(backupData.createdAt).getTime() / 1000)}:F>`, inline: true },
          { name: '👤 Créé par', value: `<@${backupData.createdBy}>`, inline: true },
          { name: '📝 Canaux', value: `${backupData.channels.length}`, inline: true },
          { name: '💬 Messages', value: `${totalMessages}`, inline: true },
          { name: '🎭 Rôles', value: `${backupData.roles.length}`, inline: true },
          { name: '😀 Emojis', value: `${backupData.emojis.length}`, inline: true },
          { name: '🎨 Stickers', value: `${backupData.stickers.length}`, inline: true },
          { name: '🔗 Webhooks', value: `${backupData.webhooks.length}`, inline: true },
          { name: '📦 Messages inclus', value: includeMessages ? '✅ Oui' : '❌ Non', inline: true }
        )
        .setColor('#00ff00')
        .setFooter({ text: '€mynona Market • Système de backup' })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      await LogManager.logMessage({
        type: 'clear',
        userId: interaction.user.id,
        channelId: interaction.channelId || undefined,
        data: {
          backupId: backupData.id,
          channels: backupData.channels.length,
          messages: totalMessages,
          roles: backupData.roles.length,
          includeMessages
        }
      });

      logger.info(`Backup créé: ${backupData.id} par ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Erreur lors de la création du backup:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Erreur lors de la création')
            .setDescription(`Une erreur est survenue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
            .setColor('#ff0000')
        ]
      });
    }
}

async function handleRestore(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const backupId = interaction.options.getString('id', true);
    const guild = interaction.guild!;

    const backupInfo = BackupManager.getBackupInfo(backupId);
    if (!backupInfo) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Sauvegarde introuvable')
            .setDescription(`Aucune sauvegarde trouvée avec l'ID \`${backupId}\``)
            .setColor('#ff0000')
        ]
      });
      return;
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmation requise')
      .setDescription(`Vous êtes sur le point de restaurer la sauvegarde **${backupId}**.\n\n**⚠️ ATTENTION:** Cette action va modifier le serveur actuel. Certains éléments peuvent être écrasés.`)
      .addFields(
        { name: '📅 Date de création', value: `<t:${Math.floor(new Date(backupInfo.createdAt).getTime() / 1000)}:F>`, inline: true },
        { name: '📝 Canaux', value: `${backupInfo.channels.length}`, inline: true },
        { name: '💬 Messages', value: `${backupInfo.channels.reduce((sum, ch) => sum + ch.messages.length, 0)}`, inline: true }
      )
      .setColor('#ffff00')
      .setFooter({ text: '€mynona Market • Système de backup' })
      .setTimestamp();

    await interaction.editReply({ embeds: [confirmEmbed] });

    const processingEmbed = new EmbedBuilder()
      .setTitle('🔄 Restauration en cours')
      .setDescription('La restauration est en cours. Cela peut prendre plusieurs minutes...')
      .setColor('#5865F2')
      .setFooter({ text: '€mynona Market • Système de backup' })
      .setTimestamp();

    await interaction.editReply({ embeds: [processingEmbed] });

    try {
      await BackupManager.restoreBackup(guild, backupId);

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Restauration terminée')
        .setDescription(`La sauvegarde **${backupId}** a été restaurée avec succès sur ce serveur.`)
        .setColor('#00ff00')
        .setFooter({ text: '€mynona Market • Système de backup' })
        .setTimestamp();

      await safeReply(interaction, { embeds: [successEmbed] });

      await LogManager.logMessage({
        type: 'clear',
        userId: interaction.user.id,
        channelId: interaction.channelId || undefined,
        data: {
          backupId: backupId,
          action: 'restore',
          restoredBy: interaction.user.id
        }
      });

      logger.info(`Backup restauré: ${backupId} par ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Erreur lors de la restauration du backup:', error);
      await safeReply(interaction, {
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Erreur lors de la restauration')
            .setDescription(`Une erreur est survenue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
            .setColor('#ff0000')
        ]
      });
    }
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
    const backups = BackupManager.listBackups();

    if (backups.length === 0) {
      await interaction.reply({
        content: '❌ Aucune sauvegarde trouvée.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('💾 Sauvegardes disponibles')
      .setDescription(`**${backups.length}** sauvegarde(s) disponible(s)`)
      .setColor('#5865F2')
      .setFooter({ text: '€mynona Market • Système de backup' })
      .setTimestamp();

    const backupInfos = backups.slice(0, 10).map(backupId => {
      const info = BackupManager.getBackupInfo(backupId);
      if (!info) return null;
      
      const totalMessages = info.channels.reduce((sum, ch) => sum + ch.messages.length, 0);
      return {
        id: backupId,
        name: info.guildName,
        date: info.createdAt,
        channels: info.channels.length,
        messages: totalMessages
      };
    }).filter(Boolean);

    if (backupInfos.length > 0) {
      embed.addFields(
        ...backupInfos.map((info: any) => ({
          name: `📦 ${info.name}`,
          value: `**ID:** \`${info.id}\`\n📅 <t:${Math.floor(new Date(info.date).getTime() / 1000)}:R>\n📝 ${info.channels} canaux • 💬 ${info.messages} messages`,
          inline: false
        }))
      );
    }

    if (backups.length > 10) {
      embed.setFooter({ text: `€mynona Market • Affichage de 10/${backups.length} sauvegardes` });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const backupId = interaction.options.getString('id', true);
    const backupInfo = BackupManager.getBackupInfo(backupId);

    if (!backupInfo) {
      await interaction.reply({
        content: `❌ Aucune sauvegarde trouvée avec l'ID \`${backupId}\``,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const totalMessages = backupInfo.channels.reduce((sum, channel) => {
      return sum + channel.messages.length + (channel.threads?.reduce((tSum, thread) => tSum + thread.messages.length, 0) || 0);
    }, 0);

    const embed = new EmbedBuilder()
      .setTitle(`💾 Informations de la sauvegarde`)
      .setDescription(`**ID:** \`${backupInfo.id}\``)
      .addFields(
        { name: '📛 Serveur original', value: backupInfo.guildName, inline: true },
        { name: '📅 Date de création', value: `<t:${Math.floor(new Date(backupInfo.createdAt).getTime() / 1000)}:F>`, inline: true },
        { name: '👤 Créé par', value: `<@${backupInfo.createdBy}>`, inline: true },
        { name: '📝 Canaux', value: `${backupInfo.channels.length}`, inline: true },
        { name: '💬 Messages', value: `${totalMessages}`, inline: true },
        { name: '🎭 Rôles', value: `${backupInfo.roles.length}`, inline: true },
        { name: '😀 Emojis', value: `${backupInfo.emojis.length}`, inline: true },
        { name: '🎨 Stickers', value: `${backupInfo.stickers.length}`, inline: true },
        { name: '🔗 Webhooks', value: `${backupInfo.webhooks.length}`, inline: true },
        { name: '📦 Version', value: backupInfo.version, inline: true }
      )
      .setColor('#5865F2')
      .setFooter({ text: '€mynona Market • Système de backup' })
      .setTimestamp();

    if (backupInfo.server.icon) {
      embed.setThumbnail(backupInfo.server.icon);
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
    const backupId = interaction.options.getString('id', true);
    const backupInfo = BackupManager.getBackupInfo(backupId);

    if (!backupInfo) {
      await interaction.reply({
        content: `❌ Aucune sauvegarde trouvée avec l'ID \`${backupId}\``,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    BackupManager.deleteBackup(backupId);

    await interaction.reply({
      content: `✅ La sauvegarde \`${backupId}\` a été supprimée avec succès.`,
      flags: MessageFlags.Ephemeral
    });

    await LogManager.logMessage({
      type: 'clear',
      userId: interaction.user.id,
      channelId: interaction.channelId || undefined,
      data: {
        backupId: backupId,
        action: 'delete'
      }
    });

    logger.info(`Backup supprimé: ${backupId} par ${interaction.user.tag}`);
}

async function safeReply(
  interaction: ChatInputCommandInteraction,
  payload: InteractionReplyOptions
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(payload as InteractionEditReplyOptions);
    } else {
      const replyPayload: InteractionReplyOptions = {
        ...payload,
        flags: payload.flags ?? MessageFlags.Ephemeral
      };
      await interaction.reply(replyPayload);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unknown Message') || message.includes('InteractionAlreadyReplied')) {
      logger.warn('[BACKUP] Impossible de mettre à jour la réponse de la commande (interaction expirée).');
      return;
    }
    logger.error('[BACKUP] Erreur lors de l\'envoi de la réponse:', error);
  }
}