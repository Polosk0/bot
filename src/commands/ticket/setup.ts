import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
    TextChannel
} from 'discord.js';
import { Command } from '../../types/command';
import { DatabaseManager } from '../../database/databaseManager';

export const ticket: Command = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gérer le système de tickets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configurer le système de tickets')
                .addChannelOption(option =>
                    option
                        .setName('category-refund')
                        .setDescription('Catégorie pour les tickets Refund')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
                .addChannelOption(option =>
                    option
                        .setName('category-boxing')
                        .setDescription('Catégorie pour les tickets Boxing')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Envoyer le panel de création de tickets')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Canal où envoyer le panel')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'ticket',

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

            if (subcommand === 'setup') {
                const categoryRefund = interaction.options.getChannel('category-refund');
                const categoryBoxing = interaction.options.getChannel('category-boxing');

                if (!categoryRefund || !categoryBoxing) {
                    await interaction.reply({
                        content: '❌ Veuillez spécifier des catégories valides.',
                        ephemeral: true
                    });
                    return;
                }

                // Sauvegarder la configuration
                const databaseManager = new DatabaseManager();
                databaseManager.updateServerConfig(interaction.guild.id, {
                    ticketCategoryRefundId: categoryRefund.id,
                    ticketCategoryBoxingId: categoryBoxing.id
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Système de tickets configuré')
                    .setDescription('Les catégories de tickets ont été configurées avec succès.')
                    .addFields(
                        { name: '💰 Refund', value: `<#${categoryRefund.id}>`, inline: true },
                        { name: '🥊 Boxing', value: `<#${categoryBoxing.id}>`, inline: true }
                    )
                    .setColor('#00ff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'panel') {
                const channel = interaction.options.getChannel('channel');

                const textChannel = channel as TextChannel;
                
                if (!textChannel) {
                    await interaction.reply({
                        content: '❌ Veuillez spécifier un canal textuel valide.',
                        ephemeral: true
                    });
                    return;
                }

                // Créer le menu de sélection
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('ticket_create')
                    .setPlaceholder('Sélectionnez un service')
                    .addOptions([
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Refund')
                            .setDescription('Demander un remboursement')
                            .setValue('refund')
                            .setEmoji('💰'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Boxing')
                            .setDescription('Service de boxing')
                            .setValue('boxing')
                            .setEmoji('🥊')
                    ]);

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

                // Créer l'embed
                const embed = new EmbedBuilder()
                    .setTitle('🎫 Système de Tickets')
                    .setDescription('Sélectionnez un service pour créer un ticket de support.')
                    .setColor('#0099ff')
                    .setTimestamp();

                await textChannel.send({
                    embeds: [embed],
                    components: [row]
                });

                await interaction.reply({
                    content: `✅ Panel de tickets envoyé dans <#${textChannel.id}>`,
                    ephemeral: true
                });
            }

            console.log('[SUCCESS] Commande ticket exécutée');

        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande ticket:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                    ephemeral: true
                });
            }
        }
    }
};
