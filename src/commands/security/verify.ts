import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextChannel,
    MessageFlags
} from 'discord.js';
import { Command } from '../../types/command';
import { DatabaseManager } from '../../database/databaseManager';

export const verify: Command = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Configurer le système de vérification web')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configurer le canal de vérification')
                .addRoleOption(option =>
                    option
                        .setName('verified-role')
                        .setDescription('Rôle à attribuer après vérification')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('unverified-role')
                        .setDescription('Rôle "Non vérifié" à supprimer')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Canal de vérification')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addStringOption(option =>
                    option
                        .setName('webhook-url')
                        .setDescription('URL du webhook Discord (optionnel, pour utiliser un webhook existant)')
                        .setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'security',

    async execute(interaction) {
        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const subcommand = interaction.options.getSubcommand();
            const databaseManager = new DatabaseManager();

            if (subcommand === 'setup') {
                const channel = interaction.options.getChannel('channel', false);
                const verifiedRole = interaction.options.getRole('verified-role', true);
                const unverifiedRole = interaction.options.getRole('unverified-role', true);
                const webhookUrl = interaction.options.getString('webhook-url', false);

                if (!verifiedRole || !unverifiedRole) {
                    await interaction.reply({
                        content: '❌ Veuillez spécifier les rôles requis.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                if (!channel && !webhookUrl) {
                    await interaction.reply({
                        content: '❌ Veuillez spécifier soit un canal, soit une URL de webhook.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const configUpdate: any = {
                    verifiedRoleId: verifiedRole.id,
                    unverifiedRoleId: unverifiedRole.id,
                    webVerificationEnabled: true
                };

                if (channel) {
                    configUpdate.verificationChannelId = channel.id;
                }

                if (webhookUrl) {
                    configUpdate.webhookUrl = webhookUrl;
                }

                databaseManager.updateServerConfig(interaction.guild.id, configUpdate);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Système de vérification configuré')
                    .setDescription('Le système de vérification web a été configuré avec succès.')
                    .addFields(
                        { 
                            name: '✅ Rôle vérifié', 
                            value: `<@&${verifiedRole.id}>`, 
                            inline: true 
                        },
                        { 
                            name: '🚫 Rôle non vérifié', 
                            value: `<@&${unverifiedRole.id}>`, 
                            inline: true 
                        }
                    )
                    .setColor('#00ff00');

                if (channel) {
                    embed.addFields({ 
                        name: '📝 Canal de vérification', 
                        value: `<#${channel.id}>`, 
                        inline: true 
                    });
                }

                if (webhookUrl) {
                    embed.addFields({ 
                        name: '🔗 Webhook', 
                        value: '✅ Configuré (URL fournie)', 
                        inline: true 
                    });
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                // Envoyer le message de vérification dans le canal (si canal spécifié)
                if (channel) {
                    const verificationEmbed = new EmbedBuilder()
                    .setTitle('🔐 Vérification Requise')
                    .setDescription(
                        '**Bienvenue sur €mynona Market !**\n\n' +
                        'Pour accéder à l\'ensemble du serveur et profiter de toutes nos fonctionnalités, vous devez compléter notre processus de vérification sécurisé. ' +
                        'Ce système nous permet de garantir la sécurité de notre communauté et de vous offrir la meilleure expérience possible.\n\n' +
                        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    )
                    .addFields(
                        { 
                            name: '📋 Comment ça fonctionne ?', 
                            value: 
                                '1️⃣ Cliquez sur le bouton **"Se Vérifier"** ci-dessous\n' +
                                '2️⃣ Vous serez redirigé vers notre plateforme sécurisée\n' +
                                '3️⃣ Complétez le processus de vérification\n' +
                                '4️⃣ Revenez sur Discord et accédez au serveur !', 
                            inline: false 
                        },
                        { 
                            name: '⏱️ Durée estimée', 
                            value: '**2 à 3 minutes**\n*Processus rapide et simple*', 
                            inline: true 
                        },
                        { 
                            name: '🛡️ Sécurité', 
                            value: '**100% sécurisé**\n*Protection SSL/TLS*', 
                            inline: true 
                        },
                        { 
                            name: '📱 Compatibilité', 
                            value: '**Mobile & Desktop**\n*Fonctionne partout*', 
                            inline: true 
                        },
                        { 
                            name: '✨ Avantages', 
                            value: 
                                '✅ Accès complet au serveur\n' +
                                '✅ Protection contre les bots\n' +
                                '✅ Communauté sécurisée\n' +
                                '✅ Support prioritaire', 
                            inline: true 
                        },
                        { 
                            name: '🔒 Confidentialité', 
                            value: 
                                '🔐 Données cryptées\n' +
                                '🔐 Aucune information stockée\n' +
                                '🔐 Conforme RGPD\n' +
                                '🔐 Validation instantanée', 
                            inline: true 
                        },
                        { 
                            name: '❓ Besoin d\'aide ?', 
                            value: 'Si vous rencontrez des difficultés, n\'hésitez pas à contacter notre équipe de support. Nous sommes là pour vous aider !', 
                            inline: false 
                        }
                    )
                    .setColor('#5865F2')
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ 
                        text: '€mynona Market • Système de vérification sécurisé • Cliquez sur le bouton pour commencer', 
                        iconURL: interaction.guild.iconURL() || undefined
                    });

                const verificationUrl = `${process.env.WEB_VERIFICATION_URL || 'http://93.127.160.64:3000'}/verify`;
                
                const verifyButton = new ButtonBuilder()
                    .setLabel('🚀 Se Vérifier')
                    .setStyle(ButtonStyle.Link)
                    .setURL(verificationUrl);

                const helpButton = new ButtonBuilder()
                    .setCustomId('verification_help')
                    .setLabel('❓ Aide')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(verifyButton, helpButton);

                    const textChannel = channel as TextChannel;
                    if (textChannel && textChannel.send) {
                        await textChannel.send({ embeds: [verificationEmbed], components: [row] });
                    }
                }
            }

        } catch (error) {
            console.error('Erreur lors de la configuration de la vérification:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de la configuration.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};



