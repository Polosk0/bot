import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ChatInputCommandInteraction,
    ButtonInteraction,
    ComponentType
} from 'discord.js';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

type CommandCategory = 'moderation' | 'security' | 'ticket' | 'embed' | 'vouch' | 'utility';

interface CommandInfo {
    name: string;
    description: string;
    subcommands?: string[];
    permissions?: string;
    emoji: string;
}

const COMMANDS: Record<CommandCategory, CommandInfo[]> = {
    moderation: [
        {
            name: 'backup',
            description: 'Gérer les sauvegardes complètes du serveur (création, restauration, liste, suppression)',
            subcommands: ['create', 'restore', 'list', 'info', 'delete'],
            permissions: 'Administrateur',
            emoji: '💾'
        },
        {
            name: 'ban',
            description: 'Bannir un membre du serveur avec raison et durée optionnelle',
            permissions: 'Bannir des membres',
            emoji: '🔨'
        },
        {
            name: 'kick',
            description: 'Expulser un membre du serveur avec raison',
            permissions: 'Expulser des membres',
            emoji: '👢'
        },
        {
            name: 'warn',
            description: 'Avertir un membre et enregistrer l\'infraction dans les logs',
            permissions: 'Gérer les messages',
            emoji: '⚠️'
        },
        {
            name: 'clear',
            description: 'Supprimer un nombre spécifique de messages dans un canal',
            permissions: 'Gérer les messages',
            emoji: '🧹'
        },
        {
            name: 'lock',
            description: 'Verrouiller ou déverrouiller un canal pour empêcher les messages',
            permissions: 'Gérer les canaux',
            emoji: '🔒'
        },
        {
            name: 'nuke',
            description: 'Supprimer tous les messages d\'un canal et le recréer (action irréversible)',
            permissions: 'Administrateur',
            emoji: '💥'
        },
        {
            name: 'reinvite',
            description: 'Réinviter des membres via OAuth (utilisateur spécifique ou en masse)',
            subcommands: ['user', 'bulk'],
            permissions: 'Administrateur',
            emoji: '🔄'
        }
    ],
    security: [
        {
            name: 'verify',
            description: 'Configurer le système de vérification web avec OAuth2 et webhooks',
            subcommands: ['setup'],
            permissions: 'Administrateur',
            emoji: '🔐'
        }
    ],
    ticket: [
        {
            name: 'ticket',
            description: 'Gérer le système de tickets avec catégories (Refund, Boxing)',
            subcommands: ['setup', 'panel'],
            permissions: 'Administrateur',
            emoji: '🎫'
        }
    ],
    embed: [
        {
            name: 'embed',
            description: 'Créer des messages embed personnalisés avec options avancées',
            subcommands: ['create'],
            permissions: 'Gérer les messages',
            emoji: '🎨'
        }
    ],
    vouch: [
        {
            name: 'vouch',
            description: 'Gérer les avis clients avec système de notation et statistiques',
            subcommands: ['create', 'stats'],
            emoji: '⭐'
        }
    ],
    utility: [
        {
            name: 'activity',
            description: 'Lancer l\'activité Discord de vérification directement dans l\'application',
            subcommands: ['launch', 'link'],
            emoji: '🎮'
        },
        {
            name: 'say',
            description: 'Faire parler le bot dans un canal avec support des embeds',
            permissions: 'Gérer les messages',
            emoji: '💬'
        },
        {
            name: 'help',
            description: 'Afficher ce menu d\'aide interactif avec toutes les commandes disponibles',
            emoji: '❓'
        }
    ]
};

const CATEGORY_EMOJIS: Record<CommandCategory, string> = {
    moderation: '🛡️',
    security: '🔒',
    ticket: '🎫',
    embed: '🎨',
    vouch: '⭐',
    utility: '⚙️'
};

const CATEGORY_NAMES: Record<CommandCategory, string> = {
    moderation: 'Modération',
    security: 'Sécurité',
    ticket: 'Tickets',
    embed: 'Embeds',
    vouch: 'Avis',
    utility: 'Utilitaires'
};

const CATEGORY_COLORS: Record<CommandCategory, number> = {
    moderation: 0xff0000,
    security: 0x00ff00,
    ticket: 0x0099ff,
    embed: 0xff00ff,
    vouch: 0xffd700,
    utility: 0x5865f2
};

function createCategoryEmbed(category: CommandCategory, page: number, totalPages: number): EmbedBuilder {
    const commands = COMMANDS[category];
    const categoryName = CATEGORY_NAMES[category];
    const categoryEmoji = CATEGORY_EMOJIS[category];
    const categoryColor = CATEGORY_COLORS[category];

    const embed = new EmbedBuilder()
        .setTitle(`${categoryEmoji} ${categoryName}`)
        .setDescription(`**Sélectionnez une commande ci-dessous**\n\n*${commands.length} commande${commands.length > 1 ? 's' : ''} disponible${commands.length > 1 ? 's' : ''} dans cette catégorie*`)
        .setColor(categoryColor)
        .setFooter({
            text: `€mynona Market • Page ${page}/${totalPages}`,
            iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png'
        })
        .setTimestamp();

    commands.forEach((cmd) => {
        const commandName = cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1);
        let value = `${cmd.description}`;
        
        if (cmd.subcommands && cmd.subcommands.length > 0) {
            value += `\n\n**Sous-commandes:** ${cmd.subcommands.map(s => `\`${s}\``).join(' • ')}`;
        }
        
        if (cmd.permissions) {
            value += `\n**Permissions:** ${cmd.permissions}`;
        }

        embed.addFields({
            name: `${cmd.emoji} ${commandName}`,
            value: value,
            inline: false
        });
    });

    return embed;
}

function createOverviewEmbed(): EmbedBuilder {
    const totalCommands = Object.values(COMMANDS).reduce((sum, cmds) => sum + cmds.length, 0);
    const categories = Object.keys(COMMANDS) as CommandCategory[];

    const embed = new EmbedBuilder()
        .setTitle('🤖 Centre d\'Aide - €mynona Market')
        .setDescription(
            `**Sélectionnez une catégorie ci-dessous**\n\n` +
            `*${totalCommands} commandes disponibles dans ${categories.length} catégories*`
        )
        .setColor(0x5865f2)
        .setThumbnail('https://cdn.discordapp.com/attachments/1234567890123456789/1234567890123456789/logo.png')
        .addFields(
            {
                name: `${CATEGORY_EMOJIS.moderation} ${CATEGORY_NAMES.moderation}`,
                value: `${COMMANDS.moderation.length} commandes disponibles\nGestion avancée du serveur, modération et administration`,
                inline: false
            },
            {
                name: `${CATEGORY_EMOJIS.security} ${CATEGORY_NAMES.security}`,
                value: `${COMMANDS.security.length} commande${COMMANDS.security.length > 1 ? 's' : ''} disponible${COMMANDS.security.length > 1 ? 's' : ''}\nSystème de vérification OAuth2 et protection du serveur`,
                inline: false
            },
            {
                name: `${CATEGORY_EMOJIS.ticket} ${CATEGORY_NAMES.ticket}`,
                value: `${COMMANDS.ticket.length} commande${COMMANDS.ticket.length > 1 ? 's' : ''} disponible${COMMANDS.ticket.length > 1 ? 's' : ''}\nSupport client automatisé avec catégories personnalisées`,
                inline: false
            },
            {
                name: `${CATEGORY_EMOJIS.embed} ${CATEGORY_NAMES.embed}`,
                value: `${COMMANDS.embed.length} commande${COMMANDS.embed.length > 1 ? 's' : ''} disponible${COMMANDS.embed.length > 1 ? 's' : ''}\nCréation de messages embed personnalisés et avancés`,
                inline: false
            },
            {
                name: `${CATEGORY_EMOJIS.vouch} ${CATEGORY_NAMES.vouch}`,
                value: `${COMMANDS.vouch.length} commande${COMMANDS.vouch.length > 1 ? 's' : ''} disponible${COMMANDS.vouch.length > 1 ? 's' : ''}\nSystème de réputation et avis clients avec statistiques`,
                inline: false
            },
            {
                name: `${CATEGORY_EMOJIS.utility} ${CATEGORY_NAMES.utility}`,
                value: `${COMMANDS.utility.length} commandes disponibles\nOutils pratiques et fonctionnalités diverses`,
                inline: false
            }
        )
        .setFooter({
            text: '€mynona Market • Système d\'aide interactif',
            iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png'
        })
        .setTimestamp();

    return embed;
}

function createCategoryButtons(currentCategory?: CommandCategory): ActionRowBuilder<ButtonBuilder>[] {
    const categories = Object.keys(COMMANDS) as CommandCategory[];
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const buttonsPerRow = 3;

    for (let i = 0; i < categories.length; i += buttonsPerRow) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const rowCategories = categories.slice(i, i + buttonsPerRow);

        rowCategories.forEach(category => {
            const isActive = currentCategory === category;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_category_${category}`)
                    .setLabel(CATEGORY_NAMES[category])
                    .setEmoji(CATEGORY_EMOJIS[category])
                    .setStyle(isActive ? ButtonStyle.Success : ButtonStyle.Primary)
            );
        });

        rows.push(row);
    }

    const navigationRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('help_overview')
                .setLabel('Accueil')
                .setEmoji('🏠')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('help_support')
                .setLabel('Support')
                .setEmoji('💬')
                .setStyle(ButtonStyle.Secondary)
        );

    rows.push(navigationRow);
    return rows;
}

export const help: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Afficher le centre d\'aide interactif avec toutes les commandes')
        .addStringOption(option =>
            option
                .setName('category')
                .setDescription('Afficher directement une catégorie spécifique')
                .setRequired(false)
                .addChoices(
                    { name: 'Modération', value: 'moderation' },
                    { name: 'Sécurité', value: 'security' },
                    { name: 'Tickets', value: 'ticket' },
                    { name: 'Embeds', value: 'embed' },
                    { name: 'Avis', value: 'vouch' },
                    { name: 'Utilitaires', value: 'utility' }
                )
        ),
    category: 'utility',

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const categoryOption = interaction.options.getString('category') as CommandCategory | null;
            
            if (categoryOption && categoryOption in COMMANDS) {
                const embed = createCategoryEmbed(categoryOption, 1, 1);
                const buttons = createCategoryButtons(categoryOption);
                
                await interaction.reply({
                    embeds: [embed],
                    components: buttons,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const embed = createOverviewEmbed();
            const buttons = createCategoryButtons();

            const response = await interaction.reply({
                embeds: [embed],
                components: buttons,
                flags: MessageFlags.Ephemeral
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000,
                filter: (i: ButtonInteraction) => i.user.id === interaction.user.id
            });

            collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
                try {
                    if (buttonInteraction.customId === 'help_overview') {
                        const overviewEmbed = createOverviewEmbed();
                        await buttonInteraction.update({
                            embeds: [overviewEmbed],
                            components: createCategoryButtons()
                        });
                        return;
                    }

                    if (buttonInteraction.customId === 'help_support') {
                        const supportEmbed = new EmbedBuilder()
                            .setTitle('💬 Support & Assistance')
                            .setDescription(
                                `**Besoin d'aide supplémentaire ?**\n\n` +
                                `*Sélectionnez une option ci-dessous pour obtenir de l'assistance*`
                            )
                            .setColor(0x0099ff)
                            .addFields(
                                {
                                    name: '🎫 Système de Tickets',
                                    value: `Créer un ticket de support\nUtilisez \`/ticket\` pour ouvrir un ticket et obtenir de l'aide personnalisée\n\nRéponse sous 24h garantie`,
                                    inline: false
                                },
                                {
                                    name: '👥 Contact Direct',
                                    value: `Contacter l'équipe\nMentionnez un administrateur ou modérateur du serveur pour une assistance immédiate`,
                                    inline: false
                                },
                                {
                                    name: '📚 Documentation',
                                    value: `En savoir plus\nConsultez \`/help\` pour explorer toutes les commandes disponibles et leurs fonctionnalités`,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text: '€mynona Market • Support client',
                                iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png'
                            })
                            .setTimestamp();

                        await buttonInteraction.update({
                            embeds: [supportEmbed],
                            components: createCategoryButtons()
                        });
                        return;
                    }

                    if (buttonInteraction.customId.startsWith('help_category_')) {
                        const category = buttonInteraction.customId.replace('help_category_', '') as CommandCategory;
                        
                        if (category in COMMANDS) {
                            const categoryEmbed = createCategoryEmbed(category, 1, 1);
                            await buttonInteraction.update({
                                embeds: [categoryEmbed],
                                components: createCategoryButtons(category)
                            });
                        }
                    }
                } catch (error) {
                    logger.error('Erreur lors de la gestion de l\'interaction help:', error);
                    if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                        await buttonInteraction.reply({
                            content: '❌ Une erreur est survenue lors de la navigation.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            });

            collector.on('end', async () => {
                try {
                    const categories = Object.keys(COMMANDS) as CommandCategory[];
                    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
                    const buttonsPerRow = 3;

                    for (let i = 0; i < categories.length; i += buttonsPerRow) {
                        const row = new ActionRowBuilder<ButtonBuilder>();
                        const rowCategories = categories.slice(i, i + buttonsPerRow);

                        rowCategories.forEach(category => {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`help_category_${category}`)
                                    .setLabel(CATEGORY_NAMES[category])
                                    .setEmoji(CATEGORY_EMOJIS[category])
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true)
                            );
                        });

                        rows.push(row);
                    }

                    const navigationRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('help_overview')
                                .setLabel('Accueil')
                                .setEmoji('🏠')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('help_support')
                                .setLabel('Support')
                                .setEmoji('💬')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );

                    rows.push(navigationRow);

                    await interaction.editReply({
                        components: rows
                    });
                } catch (error) {
                    logger.error('Erreur lors de la désactivation des boutons:', error);
                }
            });

            logger.info(`Commande help exécutée par ${interaction.user.tag}`);

        } catch (error) {
            logger.error('Erreur lors de l\'exécution de la commande help:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'affichage de l\'aide.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
