import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';

// Fonction utilitaire pour convertir les couleurs
function getColorValue(color: string): number {
    const colors: { [key: string]: number } = {
        'red': 0xff0000,
        'green': 0x00ff00,
        'blue': 0x0000ff,
        'yellow': 0xffff00,
        'orange': 0xffa500,
        'purple': 0x800080,
        'pink': 0xffc0cb,
        'cyan': 0x00ffff,
        'white': 0xffffff,
        'grey': 0x808080
    };
    return colors[color] || 0x0099ff; // Bleu par défaut
}

export const say: Command = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Faire parler le bot dans un canal')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Message à envoyer')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Canal où envoyer le message (optionnel)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('Titre de l\'embed (optionnel)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('color')
                .setDescription('Couleur de l\'embed (optionnel)')
                .setRequired(false)
                .addChoices(
                    { name: 'Rouge', value: 'red' },
                    { name: 'Vert', value: 'green' },
                    { name: 'Bleu', value: 'blue' },
                    { name: 'Jaune', value: 'yellow' },
                    { name: 'Orange', value: 'orange' },
                    { name: 'Violet', value: 'purple' },
                    { name: 'Rose', value: 'pink' },
                    { name: 'Cyan', value: 'cyan' },
                    { name: 'Blanc', value: 'white' },
                    { name: 'Gris', value: 'grey' }
                )
        )
        .addBooleanOption(option =>
            option
                .setName('embed')
                .setDescription('Envoyer en embed (par défaut: false)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('mention_everyone')
                .setDescription('Mentionner @everyone (par défaut: false)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'utility',

    async execute(interaction) {
        try {
            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    ephemeral: true
                });
                return;
            }

            const message = interaction.options.getString('message', true);
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const title = interaction.options.getString('title');
            const color = interaction.options.getString('color') || 'blue';
            const useEmbed = interaction.options.getBoolean('embed') ?? false;
            const mentionEveryone = interaction.options.getBoolean('mention_everyone') ?? false;

            // Vérifier les permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                    ephemeral: true
                });
                return;
            }

            // Vérifier que le canal est valide
            if (!channel || !('send' in channel)) {
                await interaction.reply({
                    content: '❌ Canal invalide. Veuillez spécifier un canal texte valide.',
                    ephemeral: true
                });
                return;
            }

            // Vérifier les permissions du bot dans le canal
            const botMember = interaction.guild.members.me;
            if (!botMember?.permissionsIn(channel.id).has(['SendMessages', 'ViewChannel'])) {
                await interaction.reply({
                    content: `❌ Je n'ai pas les permissions nécessaires pour envoyer des messages dans ${channel}.`,
                    ephemeral: true
                });
                return;
            }

            // Préparer le message
            let content = message;
            if (mentionEveryone) {
                content = `@everyone ${message}`;
            }

            // Envoyer le message
            if (useEmbed) {
                // Créer l'embed
                const embed = new EmbedBuilder()
                    .setDescription(content)
                    .setColor(getColorValue(color))
                    .setTimestamp();

                if (title) {
                    embed.setTitle(title);
                }

                // Ajouter l'auteur si ce n'est pas le bot
                if (interaction.user.id !== interaction.client.user?.id) {
                    embed.setFooter({ 
                        text: `Message de ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    });
                }

                await (channel as any).send({ embeds: [embed] });
            } else {
                // Envoyer en message simple (par défaut)
                await (channel as any).send(content);
            }

            // Confirmation pour l'utilisateur
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Message Envoyé')
                .setDescription(`Le message a été envoyé dans ${channel}`)
                .addFields(
                    { name: 'Canal', value: channel.toString(), inline: true },
                    { name: 'Type', value: useEmbed ? 'Embed' : 'Message simple', inline: true },
                    { name: 'Mention', value: mentionEveryone ? '@everyone' : 'Aucune', inline: true }
                )
                .setColor('#00ff00')
                .setTimestamp();

            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

            // Logger l'action
            await LogManager.logMessage({
                type: 'warn', // Utiliser warn comme type générique pour les logs
                userId: interaction.user.id,
                reason: `Message envoyé via /say dans ${(channel as any).name || 'canal inconnu'}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                data: {
                    channelId: channel.id,
                    channelName: (channel as any).name || 'canal inconnu',
                    messageLength: message.length,
                    usedEmbed: useEmbed,
                    mentionedEveryone: mentionEveryone
                }
            });

            console.log(`[SAY] ${interaction.user.tag} a envoyé un message dans #${(channel as any).name || 'canal inconnu'}`);

        } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'envoi du message.',
                    ephemeral: true
                });
            }
        }
    }
};
