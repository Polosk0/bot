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

export const setCoins: Command = {
  data: new SlashCommandBuilder()
    .setName('set-coins')
    .setDescription('Définir le solde de coins d\'un utilisateur (Admin uniquement)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Utilisateur dont définir le solde')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Montant de coins à définir')
        .setRequired(true)
        .setMinValue(0)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Raison de la définition du solde')
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
      const reason = interaction.options.getString('reason') || `Solde défini manuellement par ${interaction.user.tag}`;

      const oldBalance = CurrencyManager.getBalance(targetUser.id);
      const success = CurrencyManager.setBalance(targetUser.id, amount, reason, {
        setBy: interaction.user.id,
        setByTag: interaction.user.tag,
        oldBalance
      });

      if (!success) {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de la définition du solde.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const newBalance = CurrencyManager.getBalance(targetUser.id);

      const embed = new EmbedBuilder()
        .setTitle('✅ Solde Défini')
        .setDescription(`Le solde de ${targetUser} a été défini à **${amount.toLocaleString()}** €mynona Coins`)
        .addFields(
          { name: '👤 Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '💰 Ancien solde', value: `${oldBalance.toLocaleString()} coins`, inline: true },
          { name: '💎 Nouveau solde', value: `${newBalance.toLocaleString()} coins`, inline: true },
          { name: '📝 Raison', value: reason, inline: false },
          { name: '👮 Défini par', value: `${interaction.user.tag}`, inline: true }
        )
        .setColor('#00ff00')
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      logger.info(`[ADMIN] ${interaction.user.tag} a défini le solde de ${targetUser.tag} à ${amount} coins`);
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la commande set-coins:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la définition du solde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

