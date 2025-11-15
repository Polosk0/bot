import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';

export const nuke: Command = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Supprimer TOUS les messages du salon (action irréversible)')
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Raison de la suppression massive')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'moderation',

    async execute(interaction) {
        try {
            console.log(`[COMMAND] nuke by ${interaction.user.tag}`);

            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    ephemeral: true
                });
                return;
            }

            if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un salon textuel.',
                    ephemeral: true
                });
                return;
            }

            const reason = (interaction as any).options.getString('reason') || 'Aucune raison fournie';

            // Vérifier les permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: '❌ Vous n\'avez pas la permission d\'administrateur pour utiliser cette commande.',
                    ephemeral: true
                });
                return;
            }

            // Vérifier que le bot a les permissions nécessaires
            if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
                await interaction.reply({
                    content: '❌ Je n\'ai pas la permission de gérer les messages dans ce salon.',
                    ephemeral: true
                });
                return;
            }

            // Avertissement avant l'action
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ ATTENTION - ACTION IRRÉVERSIBLE')
                .setDescription('Vous êtes sur le point de supprimer **TOUS** les messages de ce salon.\n\nCette action est **irréversible** et ne peut pas être annulée.')
                .addFields(
                    { name: '🚨 Conséquences', value: '• Tous les messages seront supprimés définitivement\n• L\'historique du salon sera perdu\n• Cette action ne peut pas être annulée', inline: false },
                    { name: '👮 Modérateur', value: interaction.user.toString(), inline: true },
                    { name: '📋 Raison', value: reason, inline: true }
                )
                .setColor('#ff0000')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [warningEmbed],
                ephemeral: true 
            });

            // Attendre 3 secondes avant de commencer
            await new Promise(resolve => setTimeout(resolve, 3000));

            let totalDeleted = 0;
            let lastMessageId: string | undefined;

            // Supprimer tous les messages du salon
            while (true) {
                try {
                    const messages = await interaction.channel.messages.fetch({ 
                        limit: 100,
                        before: lastMessageId 
                    });

                    if (messages.size === 0) break;

                    // Filtrer les messages de plus de 14 jours (limitation Discord)
                    const messagesToDelete = messages.filter(msg => 
                        Date.now() - msg.createdTimestamp <= 14 * 24 * 60 * 60 * 1000
                    );

                    if (messagesToDelete.size === 0) break;

                    // Supprimer par lots
                    const messageArray = Array.from(messagesToDelete.values());
                    for (let i = 0; i < messageArray.length; i += 100) {
                        const batch = messageArray.slice(i, i + 100);
                        try {
                            await interaction.channel.bulkDelete(batch, true);
                            totalDeleted += batch.length;
                        } catch (error) {
                            console.error('Erreur lors de la suppression par lot:', error);
                            // Essayer de supprimer les messages un par un
                            for (const msg of batch) {
                                try {
                                    await msg.delete();
                                    totalDeleted++;
                                } catch (singleError) {
                                    console.error('Erreur lors de la suppression individuelle:', singleError);
                                }
                            }
                        }
                    }

                    // Mettre à jour lastMessageId pour la prochaine itération
                    lastMessageId = messages.last()?.id;

                    // Petite pause pour éviter le rate limit
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.error('Erreur lors de la récupération des messages:', error);
                    break;
                }
            }

            // Créer l'embed de confirmation
            const confirmationEmbed = new EmbedBuilder()
                .setTitle('💥 Salon Nuké')
                .setDescription(`**${totalDeleted}** message(s) ont été supprimés définitivement du salon.`)
                .addFields(
                    { name: '📊 Total supprimé', value: totalDeleted.toString(), inline: true },
                    { name: '👮 Modérateur', value: interaction.user.toString(), inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setColor('#ff0000')
                .setTimestamp();

            if (reason !== 'Aucune raison fournie') {
                confirmationEmbed.addFields({ name: '📋 Raison', value: reason, inline: false });
            }

            // Envoyer l'embed de confirmation
            await interaction.channel.send({ embeds: [confirmationEmbed] });

            // Logger l'action
            await LogManager.logMessage({
                type: 'nuke',
                userId: 'all',
                moderatorId: interaction.user.id,
                channelId: interaction.channel.id,
                reason: reason,
                amount: totalDeleted
            });

            console.log(`[SUCCESS] Salon nuké par ${interaction.user.tag} - ${totalDeleted} messages supprimés`);

        } catch (error) {
            console.error('Erreur lors du nuke du salon:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de la suppression massive des messages.',
                    ephemeral: true
                });
            }
        }
    }
};
