import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ChatInputCommandInteraction,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

export const syncCommands: Command = {
  data: new SlashCommandBuilder()
    .setName('sync-commands')
    .setDescription('Forcer la synchronisation des commandes avec Discord (Admin uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande. (Administrateur requis)',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const client = interaction.client;
      
      if (!client.application) {
        await interaction.editReply({
          content: '❌ Erreur: client.application est null/undefined'
        });
        return;
      }

      const commands = Array.from((client as any).commands.values()).map((cmd: any) => cmd.data.toJSON());
      const commandNames = commands.map((cmd: any) => cmd.name).join(', ');

      logger.info(`[SYNC] Synchronisation forcée de ${commands.length} commandes par ${interaction.user.tag}`);

      try {
        const result = await client.application.commands.set(commands);
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Synchronisation Réussie')
          .setDescription(`${result.size} commandes ont été synchronisées avec Discord`)
          .addFields(
            { name: '📋 Commandes synchronisées', value: commandNames || 'Aucune', inline: false },
            { name: '⏱️ Temps', value: 'Les commandes devraient apparaître dans Discord dans 1-2 minutes', inline: false }
          )
          .setColor('#00ff00')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger.info(`[SYNC] ✅ ${result.size} commandes synchronisées avec succès`);
      } catch (error) {
        logger.error('[SYNC] Erreur lors de la synchronisation:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        await interaction.editReply({
          content: `❌ Erreur lors de la synchronisation: ${errorMessage}`
        });
      }
    } catch (error) {
      logger.error('Erreur lors de l\'exécution de la commande sync-commands:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de la synchronisation.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

