import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';
import { Command } from '../../types/command';
import { LogManager } from '../../managers/logManager';
import { DatabaseManager } from '../../database/databaseManager';

export const warn: Command = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Gérer les avertissements')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Avertir un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur à avertir')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Raison de l\'avertissement')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Afficher les avertissements d\'un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Effacer tous les avertissements d\'un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: 'moderation',

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
            const user = (interaction as any).options.getUser('user');

            if (!user) {
                await interaction.reply({
                    content: '❌ Utilisateur introuvable.',
                    ephemeral: true
                });
                return;
            }

            const databaseManager = new DatabaseManager();

            if (subcommand === 'add') {
                const reason = (interaction as any).options.getString('reason');

                // Vérifier les permissions
                if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
                    await interaction.reply({
                        content: '❌ Vous n\'avez pas la permission d\'avertir des membres.',
                        ephemeral: true
                    });
                    return;
                }

                // Ajouter le warn
                databaseManager.addWarn(user.id, interaction.user.id, reason);
                
                // Mettre à jour le compteur de l'utilisateur
                let userData = databaseManager.getUser(user.id);
                
                if (userData) {
                    userData.warnings += 1;
                    databaseManager.setUser(userData);
                } else {
                    databaseManager.setUser({
                        id: user.id,
                        username: user.username,
                        discriminator: user.discriminator,
                        avatar: user.avatar || undefined,
                        joinedAt: new Date(),
                        lastActive: new Date(),
                        warnings: 1,
                        isBanned: false
                    });
                }

                const warnCount = databaseManager.getWarnCount(user.id);

                // Créer l'embed de confirmation
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Utilisateur Averti')
                    .setDescription(`${user} a reçu un avertissement.`)
                    .addFields(
                        { name: 'Utilisateur', value: user.toString(), inline: true },
                        { name: 'Modérateur', value: interaction.user.toString(), inline: true },
                        { name: 'Raison', value: reason, inline: false },
                        { name: 'Total d\'avertissements', value: warnCount.toString(), inline: true }
                    )
                    .setColor('#ffff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

                // Logger l'action
                await LogManager.logMessage({
                    type: 'warn',
                    userId: user.id,
                    moderatorId: interaction.user.id,
                    reason: reason
                });

                // Envoyer un DM à l'utilisateur
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(`⚠️ Avertissement - ${interaction.guild.name}`)
                        .setDescription(`Vous avez reçu un avertissement.`)
                        .addFields(
                            { name: 'Raison', value: reason, inline: false },
                            { name: 'Total d\'avertissements', value: warnCount.toString(), inline: true }
                        )
                        .setColor('#ffff00')
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log('Impossible d\'envoyer un DM à l\'utilisateur');
                }

            } else if (subcommand === 'list') {
                const warns = databaseManager.getWarnsByUser(user.id);
                const warnCount = databaseManager.getWarnCount(user.id);

                if (warns.length === 0) {
                    await interaction.reply({
                        content: `✅ ${user} n\'a aucun avertissement.`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📋 Avertissements de ${user.username}`)
                    .setDescription(`Total: **${warnCount}** avertissement(s)`)
                    .setColor('#ffaa00')
                    .setThumbnail(user.displayAvatarURL())
                    .setTimestamp();

                // Afficher les 10 derniers warns
                const recentWarns = warns.slice(0, 10);
                for (const warn of recentWarns) {
                    const moderator = await interaction.guild.members.fetch(warn.moderatorId).catch(() => null);
                    embed.addFields({
                        name: `⚠️ ${warn.createdAt.toLocaleDateString('fr-FR')}`,
                        value: `**Raison:** ${warn.reason}\n**Par:** ${moderator?.user.tag || 'Inconnu'}`,
                        inline: false
                    });
                }

                if (warns.length > 10) {
                    embed.setFooter({ text: `Et ${warns.length - 10} autre(s) avertissement(s)` });
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });

            } else if (subcommand === 'clear') {
                // Vérifier les permissions
                if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.reply({
                        content: '❌ Vous devez être administrateur pour effacer les avertissements.',
                        ephemeral: true
                    });
                    return;
                }

                const warnCount = databaseManager.getWarnCount(user.id);

                if (warnCount === 0) {
                    await interaction.reply({
                        content: `✅ ${user} n\'a aucun avertissement à effacer.`,
                        ephemeral: true
                    });
                    return;
                }

                // Supprimer tous les warns
                databaseManager.clearWarns(user.id);

                // Mettre à jour le compteur de l'utilisateur
                const userData = databaseManager.getUser(user.id);
                if (userData) {
                    userData.warnings = 0;
                    databaseManager.setUser(userData);
                }

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ Avertissements effacés')
                    .setDescription(`Tous les avertissements de ${user} ont été effacés.`)
                    .addFields(
                        { name: 'Utilisateur', value: user.toString(), inline: true },
                        { name: 'Modérateur', value: interaction.user.toString(), inline: true },
                        { name: 'Warnings effacés', value: warnCount.toString(), inline: true }
                    )
                    .setColor('#00ff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande warn:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                    ephemeral: true
                });
            }
        }
    }
};
