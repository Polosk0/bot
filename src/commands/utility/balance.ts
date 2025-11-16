import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChatInputCommandInteraction
} from 'discord.js';
import { Command } from '../../types/command';
import { CurrencyManager } from '../../managers/currencyManager';
import { logger } from '../../utils/logger';

export const balance: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Afficher votre solde de €mynona Coins')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Utilisateur dont vous voulez voir le solde (admin uniquement)')
        .setRequired(false)
    ),
  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const userId = targetUser?.id || interaction.user.id;

      if (targetUser && targetUser.id !== interaction.user.id) {
        if (!interaction.memberPermissions?.has('Administrator')) {
          await interaction.reply({
            content: '❌ Vous n\'avez pas la permission de voir le solde d\'un autre utilisateur.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }
      }

      const balance = CurrencyManager.getBalance(userId);
      const totalInvites = await CurrencyManager.getTotalInvites(userId);
      const nextInviteTier = await CurrencyManager.getNextInviteTier(userId);
      const nextLoyaltyTier = CurrencyManager.getNextLoyaltyTier(userId);

      const embed = new EmbedBuilder()
        .setTitle('💰 Solde €mynona Coins')
        .setDescription(`${targetUser ? targetUser : interaction.user} possède **${balance}** €mynona Coins`)
        .addFields(
          {
            name: '📊 Statistiques',
            value: `👥 Invitations: ${totalInvites}\n${nextInviteTier.tier ? `🎯 Prochain palier: ${nextInviteTier.tier.name} (${nextInviteTier.progress}/${nextInviteTier.tier.invitesRequired})` : '✅ Tous les paliers d\'invitation atteints'}`,
            inline: false
          }
        )
        .setColor('#5865F2')
        .setFooter({ text: '€mynona Market • Système de monnaie' })
        .setTimestamp();

      if (nextLoyaltyTier.tier) {
        embed.addFields({
          name: '💎 Fidélité',
          value: `🎯 Prochain palier: ${nextLoyaltyTier.tier.name} (RF: ${nextLoyaltyTier.progress}/${nextLoyaltyTier.tier.rankFactorRequired})`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la commande balance:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la récupération de votre solde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

