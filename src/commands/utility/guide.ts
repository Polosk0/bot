import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChatInputCommandInteraction,
    TextChannel,
    ChannelType
} from 'discord.js';
import { Command } from '../../types/command';
import { logger } from '../../utils/logger';

export const guide: Command = {
    data: new SlashCommandBuilder()
        .setName('guide')
        .setDescription('Envoyer le guide rapide du serveur')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Canal où envoyer le guide (optionnel, par défaut le canal actuel)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
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

            const guideEmbed = new EmbedBuilder()
                .setTitle('🎯 €MYNONA MARKET - GUIDE RAPIDE')
                .setDescription('**🌟 Votre serveur Discord de confiance !**\nGuide complet pour bien commencer et profiter de tous nos services premium.')
                .setColor(0xffa500)
                .setURL('http://93.127.160.64:3000/')
                .setImage('https://images-ext-1.discordapp.net/external/yZHm3JctPlyNjLaWa1ONa_d4vrRuFAdgqF1f7Izt6sU/https/image.noelshack.com/fichiers/2025/43/1/1760983798-guide-discorda.png?format=webp&quality=lossless')
                .setThumbnail('https://images-ext-1.discordapp.net/external/bnDqCDeDkLi3XRWqtPsuRDOun7XEjBye5Uq0LGnNbKY/https/image.noelshack.com/fichiers/2025/43/1/1760982022-3dgifmaker09929.gif')
                .addFields(
                    {
                        name: '🚀 **COMMENT COMMENCER ?**',
                        value: '**1️⃣ Vérification**\nCliquez sur "Vérifier" dans #vérification\n\n**2️⃣ Tickets**\nCréez un ticket dans #ticket\n(💰 Refund ou 🥊 Boxing)\n\n**3️⃣ Support**\nNotre équipe vous aide rapidement !',
                        inline: true
                    },
                    {
                        name: '🎫 **SERVICES DISPONIBLES**',
                        value: '**💰 REFUND**\nRemboursements & Réclamations\n\n**🥊 BOXING**\nServices de Boxing Premium',
                        inline: true
                    },
                    {
                        name: '━━━━━━━━━━━━━━━━━━━━━',
                        value: '‎',
                        inline: false
                    },
                    {
                        name: '⭐ **SYSTÈME D\'AVIS**',
                        value: '`/vouch create` - Laissez votre avis (1-5⭐)\nCommentaires automatiquement publiés',
                        inline: true
                    },
                    {
                        name: '📋 **RÈGLES IMPORTANTES**',
                        value: '✅ Respecter tous les membres\n✅ Utiliser les tickets pour le support\n✅ Signaler les comportements suspects\n❌ Pas de spam, liens suspects, harcèlement',
                        inline: true
                    },
                    {
                        name: '━━━━━━━━━━━━━━━━━━━━━',
                        value: '‎',
                        inline: false
                    },
                    {
                        name: '🆘 **BESOIN D\'AIDE ?**',
                        value: '🎫 Créez un ticket dans #ticket\n📞 Mentionnez @Staff pour les urgences\n⚡ Support rapide et professionnel',
                        inline: true
                    }
                )
                .setFooter({
                    text: 'Merci de faire confiance à €mynona Market ! Bonne visite et bienvenue dans notre communauté ! ✨'
                });

            await channel.send({ embeds: [guideEmbed] });

            await interaction.reply({
                content: `✅ Guide rapide envoyé dans ${channel}`,
                flags: MessageFlags.Ephemeral
            });

            logger.info(`Guide rapide envoyé dans ${channel.name} par ${interaction.user.tag}`);

        } catch (error) {
            logger.error('Erreur lors de l\'envoi du guide rapide:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'envoi du guide.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};

