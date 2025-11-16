import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChatInputCommandInteraction
} from 'discord.js';
import { Command } from '../../types/command';
import { DatabaseManager } from '../../database/databaseManager';
import { CurrencyManager } from '../../managers/currencyManager';
import { logger } from '../../utils/logger';

export const setRf: Command = {
  data: new SlashCommandBuilder()
    .setName('set-rf')
    .setDescription('Définir le Rank Factor d\'un utilisateur (Admin uniquement)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Utilisateur dont vous voulez définir le RF')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName('rf')
        .setDescription('Valeur du Rank Factor')
        .setRequired(true)
        .setMinValue(0)
    ),
  category: 'moderation',

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.reply({
          content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const targetUser = interaction.options.getUser('user', true);
      const rfValue = interaction.options.getNumber('rf', true);

      const databaseManager = new DatabaseManager();
      const user = databaseManager.getUser(targetUser.id);

      if (!user) {
        await interaction.reply({
          content: '❌ Utilisateur non trouvé dans la base de données.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const oldRF = user.rankFactor || 0;
      databaseManager.updateUser(targetUser.id, {
        rankFactor: rfValue
      });

      const rewardResult = await CurrencyManager.checkAndRewardLoyalty(targetUser.id, rfValue);

      const embed = new EmbedBuilder()
        .setTitle('✅ Rank Factor Mis à Jour')
        .setDescription(`Le Rank Factor de ${targetUser} a été mis à jour.`)
        .addFields(
          { name: 'Ancien RF', value: `${oldRF}`, inline: true },
          { name: 'Nouveau RF', value: `${rfValue}`, inline: true },
          { name: 'Différence', value: `${rfValue - oldRF > 0 ? '+' : ''}${rfValue - oldRF}`, inline: true }
        )
        .setColor('#00ff00')
        .setTimestamp();

      if (rewardResult.rewarded && rewardResult.tier) {
        embed.addFields({
          name: '🎉 Récompense de Fidélité',
          value: `Palier **${rewardResult.tier.name}** atteint !\n💰 ${rewardResult.coins} €mynona Coins attribués`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });

      if (rewardResult.rewarded && rewardResult.tier) {
        try {
          const rewardEmbed = new EmbedBuilder()
            .setTitle('🎉 Récompense de Fidélité !')
            .setDescription(`Félicitations ${targetUser}, vous avez atteint le palier **${rewardResult.tier.name}** !`)
            .addFields(
              { name: '💰 Coins reçus', value: `${rewardResult.coins} €mynona Coins`, inline: true },
              { name: '📊 Palier', value: `Tier ${rewardResult.tier.tier}`, inline: true },
              { name: '💎 Rank Factor', value: `${rfValue}`, inline: true }
            )
            .setColor('#8B5CF6')
            .setTimestamp();

          await targetUser.send({ embeds: [rewardEmbed] });
        } catch (error) {
          logger.warn(`Impossible d'envoyer le message de récompense à ${targetUser.tag}`);
        }
      }
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la commande set-rf:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la mise à jour du Rank Factor.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

