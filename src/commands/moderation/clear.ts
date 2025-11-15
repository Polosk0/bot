import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    TextChannel
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';

export const clear: Command = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprimer un nombre spécifique de messages')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Utilisateur spécifique (optionnel)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Raison de la suppression')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    category: 'moderation',

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild || !interaction.channel) {
            await interaction.reply({
                content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                ephemeral: true
            });
            return;
        }

        const amount = interaction.options.getInteger('amount', true);
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Non spécifiée';

        if (!(interaction.channel instanceof TextChannel)) {
            await interaction.reply({
                content: '❌ Cette commande ne peut être utilisée que dans un salon textuel.',
                ephemeral: true
            });
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            let deletedCount = 0;
            let lastMessageId: string | undefined;

            // Supprimer les messages par lots de 100 (limite Discord)
            while (deletedCount < amount) {
                const remaining = amount - deletedCount;
                const batchSize = Math.min(remaining, 100);

                const messages = await interaction.channel!.messages.fetch({
                    limit: batchSize,
                    before: lastMessageId
                });

                if (messages.size === 0) break;

                // Filtrer par utilisateur si spécifié
                let messagesToDelete = user 
                    ? messages.filter(msg => msg.author.id === user.id)
                    : messages;

                if (messagesToDelete.size === 0) break;

                // Prendre seulement le nombre de messages nécessaires
                const messagesToDeleteArray = Array.from(messagesToDelete.values()).slice(0, batchSize);

                if (messagesToDeleteArray.length === 0) break;

                // Supprimer les messages
                const deleted = await interaction.channel!.bulkDelete(messagesToDeleteArray, true);
                deletedCount += deleted.size;
                lastMessageId = messages.last()?.id;

                // Attendre un peu pour éviter le rate limit
                if (deletedCount < amount) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Log de l'action
            await LogManager.logMessage({
                type: 'clear',
                userId: user?.id || 'all',
                moderatorId: interaction.user.id,
                channelId: interaction.channel.id,
                reason: reason,
                amount: deletedCount
            });

            // Message de confirmation
            await interaction.editReply({
                content: `✅ **${deletedCount}** message(s) supprimé(s)${user ? ` de ${user.tag}` : ''}`
            });

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de la suppression des messages.'
            });
        }
    }
};