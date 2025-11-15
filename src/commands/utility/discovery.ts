import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
    TextChannel,
    MessageFlags,
    ChatInputCommandInteraction
} from 'discord.js';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

export const discovery: Command = {
    data: new SlashCommandBuilder()
        .setName('discovery')
        .setDescription('Envoyer le formulaire de découverte dans un canal')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Canal où envoyer le formulaire (optionnel, par défaut le canal actuel)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        ),
    category: 'utility',

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const targetChannel = interaction.options.getChannel('channel') as TextChannel | null;
            const channel = targetChannel || (interaction.channel as TextChannel);

            if (!channel || !channel.isTextBased()) {
                await interaction.reply({
                    content: '❌ Le canal spécifié n\'est pas un canal texte valide.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('discovery_select')
                .setPlaceholder('Sélectionnez comment vous nous avez découvert')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('D\'un ami')
                        .setDescription('Un ami vous a parlé de nous')
                        .setValue('friend')
                        .setEmoji('👥'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('D\'une pub')
                        .setDescription('Vous nous avez vu dans une publicité')
                        .setValue('ad')
                        .setEmoji('📢'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Autres')
                        .setDescription('Autre moyen de découverte')
                        .setValue('other')
                        .setEmoji('💭')
                ]);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('👥 Comment nous avez-vous découvert ?')
                .setDescription(
                    '**Bienvenue dans notre communauté !**\n\n' +
                    'Aidez-nous à mieux comprendre comment vous nous avez trouvés en sélectionnant une option ci-dessous.\n\n' +
                    'Vous pourrez ensuite ajouter des détails supplémentaires si nécessaire.'
                )
                .setColor('#5865F2')
                .setFooter({
                    text: '€mynona Market • Formulaire de découverte',
                    iconURL: interaction.guild.iconURL() || undefined
                });

            await channel.send({
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({
                content: `✅ Formulaire de découverte envoyé dans ${channel}`,
                flags: MessageFlags.Ephemeral
            });

            logger.info(`Formulaire de découverte envoyé dans ${channel.name} par ${interaction.user.tag}`);

        } catch (error) {
            logger.error('Erreur lors de l\'envoi du formulaire de découverte:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'envoi du formulaire.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};

