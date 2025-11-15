import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';

export const lock: Command = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verrouiller un canal pour empêcher les utilisateurs d\'écrire')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Canal à verrouiller')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Raison du verrouillage')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    category: 'moderation',

    async execute(interaction) {
        try {
            console.log(`[COMMAND] lock by ${interaction.user.tag}`);

            if (!interaction.guild) {
                await interaction.reply({
                    content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                    ephemeral: true
                });
                return;
            }

            const channel = (interaction as any).options.getChannel('channel') || interaction.channel;
            const reason = (interaction as any).options.getString('reason') || 'Aucune raison fournie';

            if (!channel || !channel.isTextBased()) {
                await interaction.reply({
                    content: '❌ Canal invalide.',
                    ephemeral: true
                });
                return;
            }

            // Vérifier les permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.reply({
                    content: '❌ Vous n\'avez pas la permission de gérer les canaux.',
                    ephemeral: true
                });
                return;
            }

            // Vérifier si le canal est déjà verrouillé
            const everyoneRole = interaction.guild.roles.everyone;
            const currentPermissions = channel.permissionsFor(everyoneRole);

            if (currentPermissions && !currentPermissions.has('SendMessages')) {
                await interaction.reply({
                    content: '❌ Ce canal est déjà verrouillé.',
                    ephemeral: true
                });
                return;
            }

            // Verrouiller le canal
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setTitle('🔒 Canal Verrouillé')
                .setDescription(`Le canal ${channel} a été verrouillé.`)
                .addFields(
                    { name: 'Modérateur', value: interaction.user.toString(), inline: true },
                    { name: 'Canal', value: channel.toString(), inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setColor('#ff6b6b')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Logger l'action
            await LogManager.logMessage({
                type: 'warn',
                userId: interaction.user.id,
                reason: `Canal ${channel.name} verrouillé: ${reason}`
            });

            console.log(`[SUCCESS] Canal ${channel.name} verrouillé par ${interaction.user.tag}`);

        } catch (error) {
            console.error('Erreur lors du verrouillage du canal:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors du verrouillage du canal.',
                    ephemeral: true
                });
            }
        }
    }
};