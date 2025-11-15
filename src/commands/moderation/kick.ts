import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';

export const kick: Command = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulser un utilisateur du serveur')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Utilisateur à expulser')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Raison de l\'expulsion')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    category: 'moderation',

    async execute(interaction) {
        try {
            console.log(`[COMMAND] kick by ${interaction.user.tag}`);

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
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
                await interaction.reply({
                    content: '❌ Vous n\'avez pas la permission d\'expulser des membres.',
                    ephemeral: true
                });
                return;
            }

            // Récupérer le membre
            const member = await interaction.guild.members.fetch(user.id);
            
            // Envoyer un DM à l'utilisateur avant l'expulsion
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Vous avez été expulsé du serveur')
                    .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}**.`)
                    .addFields(
                        { name: '📋 Motif', value: reason, inline: false },
                        { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .addFields(
                        { 
                            name: '⚠️ Avertissement Important', 
                            value: '**La prochaine fois, ce sera un bannissement définitif du serveur et non un simple kick.**\n\nVeuillez respecter les règles du serveur pour éviter cela.', 
                            inline: false 
                        }
                    )
                    .setColor('#ff4444')
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: 'Système de modération automatique' })
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
                console.log(`[DM] Message d'expulsion envoyé à ${user.tag}`);
            } catch (dmError) {
                console.log(`[WARNING] Impossible d'envoyer un DM à ${user.tag}:`, dmError);
                // Continuer l'expulsion même si le DM échoue
            }

            // Attendre un court délai pour que le DM soit envoyé
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Expulser l'utilisateur
            await member.kick(reason);

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setTitle('👢 Utilisateur Expulsé')
                .setDescription(`${user} a été expulsé du serveur.`)
                .addFields(
                    { name: 'Utilisateur', value: user.toString(), inline: true },
                    { name: 'Modérateur', value: interaction.user.toString(), inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setColor('#ffa500')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Logger l'action
            await LogManager.logMessage({
                type: 'kick',
                userId: user.id,
                moderatorId: interaction.user.id,
                reason: reason
            });

            console.log(`[SUCCESS] ${user.tag} expulsé par ${interaction.user.tag}`);

        } catch (error) {
            console.error('Erreur lors de l\'expulsion:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'expulsion.',
                    ephemeral: true
                });
            }
        }
    }
};