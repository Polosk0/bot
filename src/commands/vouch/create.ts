import {
    SlashCommandBuilder,
    EmbedBuilder,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ChatInputCommandInteraction
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';
import { DatabaseManager } from '../../database/databaseManager';
import { logger } from '../../utils/logger';

export const vouch: Command = {
    data: new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Créer un avis sur vos services')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Publier un avis reçu')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Voir vos statistiques d\'avis')
        ),
    category: 'vouch',

    async execute(interaction) {
        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    ephemeral: true
                });
                return;
            }

            const subcommand = interaction.options.getSubcommand();
            const databaseManager = new DatabaseManager();

            if (subcommand === 'create') {
                const embed = new EmbedBuilder()
                    .setTitle('⭐ Publier un Avis')
                    .setDescription(
                        '**Créez un avis pour partager votre expérience !**\n\n' +
                        'Cliquez sur le bouton ci-dessous pour remplir le formulaire et publier votre avis dans le salon dédié.'
                    )
                    .setColor('#ffd700')
                    .setFooter({
                        text: '€mynona Market • Système d\'avis'
                    });

                const button = new ButtonBuilder()
                    .setCustomId('vouch_create_modal')
                    .setLabel('Publier un avis')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝');

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

                await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });

                logger.info(`[VOUCH] Formulaire d'avis demandé par ${interaction.user.tag}`);

            } else if (subcommand === 'stats') {
                // Afficher les statistiques de l'utilisateur
                const vouches = databaseManager.getVouchesByUser(interaction.user.id);

                if (vouches.length === 0) {
                    await interaction.reply({
                        content: '📊 Vous n\'avez encore aucun avis publié.',
                        ephemeral: true
                    });
                    return;
                }

                const totalRating = vouches.reduce((sum, v) => sum + v.rating, 0);
                const averageRating = (totalRating / vouches.length).toFixed(1);

                // Compter les notes
                const ratingCounts = {
                    5: vouches.filter(v => v.rating === 5).length,
                    4: vouches.filter(v => v.rating === 4).length,
                    3: vouches.filter(v => v.rating === 3).length,
                    2: vouches.filter(v => v.rating === 2).length,
                    1: vouches.filter(v => v.rating === 1).length
                };

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Statistiques d'Avis de ${interaction.user.username}`)
                    .setDescription(`**Total d'avis :** ${vouches.length}\n**Note moyenne :** ${'⭐'.repeat(Math.round(parseFloat(averageRating)))} ${averageRating}/5`)
                    .addFields(
                        { name: '⭐⭐⭐⭐⭐', value: `${ratingCounts[5]} avis`, inline: true },
                        { name: '⭐⭐⭐⭐', value: `${ratingCounts[4]} avis`, inline: true },
                        { name: '⭐⭐⭐', value: `${ratingCounts[3]} avis`, inline: true },
                        { name: '⭐⭐', value: `${ratingCounts[2]} avis`, inline: true },
                        { name: '⭐', value: `${ratingCounts[1]} avis`, inline: true }
                    )
                    .setColor('#ffd700')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setTimestamp();

                // Afficher les 5 derniers avis
                const recentVouches = vouches.slice(0, 5);
                if (recentVouches.length > 0) {
                    const recentText = recentVouches.map((v, index) => {
                        const stars = '⭐'.repeat(v.rating);
                        const date = v.createdAt.toLocaleDateString('fr-FR');
                        return `${index + 1}. ${stars} - ${date}`;
                    }).join('\n');

                    embed.addFields({ name: '📋 Derniers Avis', value: recentText, inline: false });
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Erreur lors de la création du vouch:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de la création de l\'avis.',
                    ephemeral: true
                });
            }
        }
    }
};
