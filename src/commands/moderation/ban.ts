import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';

export const ban: Command = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un utilisateur du serveur')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Utilisateur à bannir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Raison du bannissement')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: 'moderation',

    async execute(interaction) {
        try {
            console.log(`[COMMAND] ban by ${interaction.user.tag}`);

            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    ephemeral: true
                });
                return;
            }

            const user = (interaction as any).options.getUser('user');
            const reason = (interaction as any).options.getString('reason') || 'Aucune raison fournie';

            if (!user) {
                await interaction.reply({
                    content: '❌ Utilisateur introuvable.',
                    ephemeral: true
                });
                return;
            }

            // Vérifier les permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
                await interaction.reply({
                    content: '❌ Vous n\'avez pas la permission de bannir des membres.',
                    ephemeral: true
                });
                return;
            }

            // Envoyer un DM à l'utilisateur avant le bannissement
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔨 Vous avez été banni du serveur')
                    .setDescription(`Vous avez été banni définitivement du serveur **${interaction.guild.name}**.`)
                    .addFields(
                        { name: '📋 Motif', value: reason, inline: false },
                        { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .addFields(
                        { 
                            name: '⚠️ Bannissement Définitif', 
                            value: 'Ce bannissement est définitif. Vous ne pourrez plus rejoindre ce serveur.\n\nSi vous pensez que ce bannissement est injustifié, vous pouvez contacter un administrateur.', 
                            inline: false 
                        }
                    )
                    .setColor('#ff0000')
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: 'Système de modération automatique' })
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
                console.log(`[DM] Message de bannissement envoyé à ${user.tag}`);
            } catch (dmError) {
                console.log(`[WARNING] Impossible d'envoyer un DM à ${user.tag}:`, dmError);
                // Continuer le bannissement même si le DM échoue
            }

            // Attendre un court délai pour que le DM soit envoyé
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Bannir l'utilisateur
            await interaction.guild.members.ban(user, { reason });

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setTitle('🔨 Utilisateur Banni')
                .setDescription(`${user} a été banni du serveur.`)
                .addFields(
                    { name: 'Utilisateur', value: user.toString(), inline: true },
                    { name: 'Modérateur', value: interaction.user.toString(), inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setColor('#ff0000')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Logger l'action
            await LogManager.logMessage({
                type: 'ban',
                userId: user.id,
                moderatorId: interaction.user.id,
                reason: reason
            });

            console.log(`[SUCCESS] ${user.tag} banni par ${interaction.user.tag}`);

        } catch (error) {
            console.error('Erreur lors du bannissement:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors du bannissement.',
                    ephemeral: true
                });
            }
        }
    }
};