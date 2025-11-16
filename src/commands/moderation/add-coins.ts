import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types/command';
import { CurrencyManager } from '../../managers/currencyManager';
import { logger } from '../../utils/logger';

export const addCoins: Command = {
  data: new SlashCommandBuilder()
    .setName('add-coins')
    .setDescription('Ajouter des €mynona Coins à un utilisateur (Admin uniquement)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Utilisateur à qui ajouter des coins')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Montant de coins à ajouter')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Raison de l\'ajout de coins')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'moderation',

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande. (Administrateur requis)',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const targetUser = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      const reason = interaction.options.getString('reason') || `Ajout manuel par ${interaction.user.tag}`;

      const success = CurrencyManager.addCoins(targetUser.id, amount, reason, {
        addedBy: interaction.user.id,
        addedByTag: interaction.user.tag
      });

      if (!success) {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de l\'ajout des coins.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const newBalance = CurrencyManager.getBalance(targetUser.id);

      const embed = new EmbedBuilder()
        .setTitle('✅ Coins Ajoutés')
        .setDescription(`${amount} €mynona Coins ont été ajoutés à ${targetUser}`)
        .addFields(
          { name: '👤 Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '💰 Montant ajouté', value: `${amount} coins`, inline: true },
          { name: '💎 Nouveau solde', value: `${newBalance} coins`, inline: true },
          { name: '📝 Raison', value: reason, inline: false },
          { name: '👮 Ajouté par', value: `${interaction.user.tag}`, inline: true }
        )
        .setColor('#00ff00')
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      try {
        const userEmbed = new EmbedBuilder()
          .setTitle('💰 Coins Reçus !')
          .setDescription(`Vous avez reçu **${amount}** €mynona Coins !`)
          .addFields(
            { name: '💎 Nouveau solde', value: `${newBalance} coins`, inline: true },
            { name: '📝 Raison', value: reason, inline: false }
          )
          .setColor('#00ff00')
          .setTimestamp();

        await targetUser.send({ embeds: [userEmbed] });
      } catch (error) {
        logger.warn(`Impossible d'envoyer le message de notification à ${targetUser.tag}`);
      }

      logger.info(`[ADMIN] ${interaction.user.tag} a ajouté ${amount} coins à ${targetUser.tag}`);
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la commande add-coins:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'ajout des coins.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

