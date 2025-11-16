import {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    ChatInputCommandInteraction
} from 'discord.js';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';
import axios from 'axios';

const ACTIVITY_URL = process.env.ACTIVITY_URL || process.env.WEB_VERIFICATION_URL || 'https://emynona.shop';

export const activity: Command = {
    data: new SlashCommandBuilder()
        .setName('activity')
        .setDescription('Accéder au système de monnaie €mynona - Caisses, Roue de réductions et plus !')
        .addStringOption(option =>
            option
                .setName('action')
                .setDescription('Action à effectuer')
                .setRequired(false)
                .addChoices(
                    { name: 'Ouvrir une caisse', value: 'crate' },
                    { name: 'Tourner la roue', value: 'wheel' },
                    { name: 'Voir mon solde', value: 'balance' },
                    { name: 'Afficher le lien', value: 'link' }
                )
        ),
    category: 'utility',

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const action = interaction.options.getString('action') || 'launch';

            if (action === 'link') {
                const embed = new EmbedBuilder()
                    .setTitle('🔗 Lien du Système €mynona')
                    .setDescription(`Cliquez sur le lien ci-dessous pour accéder au système de monnaie :`)
                    .addFields({
                        name: '🌐 URL',
                        value: `[${ACTIVITY_URL}/activity](${ACTIVITY_URL}/activity)`
                    })
                    .setColor('#5865F2')
                    .setFooter({ text: '€mynona Market • Système de monnaie' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            if (action === 'balance') {
                const { CurrencyManager } = await import('../../managers/currencyManager');
                const balance = CurrencyManager.getBalance(interaction.user.id);
                const totalInvites = await CurrencyManager.getTotalInvites(interaction.user.id);
                
                const embed = new EmbedBuilder()
                    .setTitle('💰 Votre Solde')
                    .setDescription(`Vous possédez **${balance}** €mynona Coins`)
                    .addFields(
                        { name: '👥 Invitations', value: `${totalInvites}`, inline: true },
                        { name: '💎 Utilisation', value: 'Utilisez `/activity crate` ou `/activity wheel` pour dépenser vos coins !', inline: false }
                    )
                    .setColor('#00ff00')
                    .setFooter({ text: '€mynona Market • Système de monnaie' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const client = interaction.client;
            const applicationId = client.application?.id;

            if (!applicationId) {
                await interaction.reply({
                    content: '❌ Impossible de récupérer l\'ID de l\'application.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            try {
                const inviteCode = await createActivityInvite(interaction.guild.id, applicationId);
                
                const actionType = action || 'crate';
                const gameUrl = `${ACTIVITY_URL}/activity?action=${actionType}&userId=${interaction.user.id}`;
                
                const embed = new EmbedBuilder()
                    .setTitle('🎰 Système €mynona Coins')
                    .setDescription(`Accédez au système de monnaie pour ouvrir des caisses, tourner la roue et gagner des récompenses !`)
                    .addFields(
                        {
                            name: '📦 Caisses',
                            value: 'Ouvrez des caisses pour gagner des récompenses exclusives',
                            inline: true
                        },
                        {
                            name: '🎡 Roue de Réductions',
                            value: 'Tournez la roue pour gagner des réductions sur vos achats',
                            inline: true
                        },
                        {
                            name: '🔗 Accès',
                            value: `[Cliquez ici pour accéder](${gameUrl})`,
                            inline: false
                        }
                    )
                    .setColor('#5865F2')
                    .setFooter({ text: '€mynona Market • Système de monnaie' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } catch (error: any) {
                logger.error('Erreur lors du lancement de l\'activité:', error);
                
                const embed = new EmbedBuilder()
                    .setTitle('🌐 Page de Vérification')
                    .setDescription(`Accédez à la page de vérification pour compléter votre profil :`)
                    .addFields({
                        name: '🔗 URL',
                        value: `[${ACTIVITY_URL}](${ACTIVITY_URL})`
                    })
                    .setColor('#5865F2')
                    .setFooter({ text: '€mynona Market • Système de vérification' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Erreur lors de l\'exécution de la commande activity:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors du lancement de l\'activité.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};

async function createActivityInvite(guildId: string, applicationId: string): Promise<string | null> {
    try {
        const token = process.env.DISCORD_TOKEN;
        if (!token) {
            logger.warn('DISCORD_TOKEN manquant pour créer une invitation d\'activité');
            return null;
        }

        const channel = await getFirstTextChannel(guildId, token);
        if (!channel) {
            logger.warn('Aucun canal texte trouvé pour créer une invitation d\'activité');
            return null;
        }

        const response = await axios.post(
            `https://discord.com/api/v10/channels/${channel}/invites`,
            {
                max_age: 3600,
                max_uses: 0,
                target_application_id: applicationId,
                target_type: 2
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bot ${token}`
                }
            }
        );

        return response.data.code || null;
    } catch (error: any) {
        if (error.response) {
            logger.warn(`Impossible de créer une invitation d'activité: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            logger.error('Erreur lors de la création de l\'invitation d\'activité:', error.message);
        }
        return null;
    }
}

async function getFirstTextChannel(guildId: string, token: string): Promise<string | null> {
    try {
        const response = await axios.get(
            `https://discord.com/api/v10/guilds/${guildId}/channels`,
            {
                headers: {
                    'Authorization': `Bot ${token}`
                }
            }
        );

        const textChannel = response.data.find((ch: any) => ch.type === 0);
        return textChannel?.id || null;
    } catch (error) {
        logger.error('Erreur lors de la récupération des canaux:', error);
        return null;
    }
}

