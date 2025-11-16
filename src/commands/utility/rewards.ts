import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChatInputCommandInteraction
} from 'discord.js';
import { Command } from '../../types/command';
import { CurrencyManager } from '../../managers/currencyManager';
import { logger } from '../../utils/logger';

export const rewards: Command = {
  data: new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('Afficher les paliers de récompenses disponibles')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type de récompenses à afficher')
        .setRequired(false)
        .addChoices(
          { name: 'Invitations', value: 'invites' },
          { name: 'Fidélité', value: 'loyalty' },
          { name: 'Tout', value: 'all' }
        )
    ),
  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const type = interaction.options.getString('type') || 'all';

      if (type === 'invites' || type === 'all') {
        const inviteTiers = CurrencyManager.getInviteRewardTiers();
        const totalInvites = await CurrencyManager.getTotalInvites(interaction.user.id);
        const nextTier = await CurrencyManager.getNextInviteTier(interaction.user.id);

        const inviteEmbed = new EmbedBuilder()
          .setTitle('🎁 Paliers de Récompenses - Invitations')
          .setDescription(`Vous avez actuellement **${totalInvites}** invitations`)
          .setColor('#00ff00');

        inviteTiers.forEach(tier => {
          const isClaimed = tier.tier <= (nextTier.tier?.tier || 0) - 1;
          const isNext = tier.tier === nextTier.tier?.tier;
          const status = isClaimed ? '✅' : isNext ? '🎯' : '⏳';
          
          inviteEmbed.addFields({
            name: `${status} Tier ${tier.tier} - ${tier.name}`,
            value: `👥 ${tier.invitesRequired} invitations → 💰 ${tier.coinsReward} coins`,
            inline: false
          });
        });

        await interaction.reply({ embeds: [inviteEmbed], flags: MessageFlags.Ephemeral });
      }

      if (type === 'loyalty' || type === 'all') {
        const loyaltyTiers = CurrencyManager.getLoyaltyRewardTiers();
        const user = CurrencyManager['databaseManager'].getUser(interaction.user.id);
        const currentRF = user?.rankFactor || 0;

        const loyaltyEmbed = new EmbedBuilder()
          .setTitle('💎 Paliers de Récompenses - Fidélité')
          .setDescription(`Votre Rank Factor actuel: **${currentRF}**`)
          .setColor('#8B5CF6');

        loyaltyTiers.forEach(tier => {
          const isReached = currentRF >= tier.rankFactorRequired;
          const status = isReached ? '✅' : '⏳';
          
          loyaltyEmbed.addFields({
            name: `${status} Tier ${tier.tier} - ${tier.name}`,
            value: `📊 RF ${tier.rankFactorRequired} → 💰 ${tier.coinsReward} coins`,
            inline: false
          });
        });

        if (type === 'all') {
          await interaction.followUp({ embeds: [loyaltyEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [loyaltyEmbed], flags: MessageFlags.Ephemeral });
        }
      }
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la commande rewards:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'affichage des récompenses.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

