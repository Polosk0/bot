import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags,
    ChatInputCommandInteraction,
    Guild,
    Client
} from 'discord.js';
import { Command } from '../../types/command';
import { InviteManager } from '../../managers/inviteManager';
import { logger } from '../../utils/logger';
import { DatabaseManager } from '../../database/databaseManager';
import { OAuthHelper } from '../../utils/oauthHelper';
import { UserOAuthToken } from '../../types/database';
import { LogManager } from '../../managers/logManager';

const databaseManager = new DatabaseManager();

export const reinvite: Command = {
    data: new SlashCommandBuilder()
        .setName('reinvite')
        .setDescription('Réinviter des membres automatiquement')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Réinviter un utilisateur spécifique')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur à réinviter')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bulk')
                .setDescription('Réinviter plusieurs clients en une fois')
                .addStringOption(option =>
                    option
                        .setName('scope')
                        .setDescription('Portée de la réinvitation')
                        .addChoices(
                            { name: 'Clients enregistrés', value: 'clients' },
                            { name: 'Tous les utilisateurs connus', value: 'everyone' }
                        )
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: 'moderation',

    async execute(interaction) {
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'bulk') {
            await handleBulkReinvite(interaction);
        } else {
            await handleSingleReinvite(interaction);
        }
    }
};

async function handleSingleReinvite(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        const targetUser = interaction.options.getUser('user', true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guild = interaction.guild!;
        const existingMember = await guild.members.fetch({ user: targetUser.id, force: false }).catch(() => null);
        if (existingMember) {
            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Utilisateur déjà présent')
                .setDescription(`${targetUser} est déjà membre du serveur.`)
                .setColor('#ffaa00')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const storedToken = databaseManager.getUserOAuthToken(targetUser.id);
        if (!storedToken) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Réinvitation impossible')
                .setDescription(`${targetUser} n'a pas autorisé la réinvitation automatique.`)
                .addFields({
                    name: '💡 Solution',
                    value: 'Demandez-lui de se reconnecter via la page de vérification pour enregistrer une autorisation.'
                })
                .setColor('#ff0000')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const reinviteResult = await attemptOAuthReinvite(guild, targetUser.id, storedToken);
        if (!reinviteResult.success) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Réinvitation échouée')
                .setDescription(
                    reinviteResult.authExpired
                        ? `${targetUser} doit renouveler son autorisation OAuth avant de pouvoir être réinvité.`
                        : `Discord a refusé la réinvitation de ${targetUser}.`
                )
                .addFields({ name: 'Détails', value: reinviteResult.error ?? 'Inconnu' })
                .setColor('#ff0000')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const config = databaseManager.getServerConfig(guild.id);
        const embedFields: { name: string; value: string; inline?: boolean }[] = [
            {
                name: '👤 Utilisateur',
                value: `${targetUser.tag} (${targetUser.id})`,
                inline: true
            }
        ];
        if (config?.verifiedRoleId) {
            embedFields.push({
                name: '✅ Rôle assigné',
                value: `<@&${config.verifiedRoleId}>`,
                inline: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Réinvitation effectuée')
            .setDescription(`${targetUser} a été réinvité automatiquement via OAuth.`)
            .addFields(...embedFields)
            .setColor('#00ff00')
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({
                text: '€mynona Market • Système de réinvitation',
                iconURL: guild.iconURL() || undefined
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        await notifyUserReinvited(targetUser.id, guild, interaction.client);
        await logReinvite(interaction, targetUser.id);
        logger.info(`Réinvitation OAuth effectuée pour ${targetUser.tag} (${targetUser.id}) par ${interaction.user.tag}`);
    } catch (error) {
        await handleExecutionError(interaction, error);
    }
}

async function handleBulkReinvite(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const guild = interaction.guild!;
        const scope = interaction.options.getString('scope') ?? 'clients';

        const tokenEntries = databaseManager.getAllOAuthTokens();
        const tokenMap = new Map(tokenEntries.map(entry => [entry.userId, entry]));
        const targetUserIds = new Set<string>(tokenEntries.map(entry => entry.userId));

        if (scope === 'everyone') {
            InviteManager.getTrackedUserIds().forEach(id => targetUserIds.add(id));
        }

        if (targetUserIds.size === 0) {
            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Aucun client enregistré')
                .setDescription('Aucun utilisateur ne possède actuellement d’autorisation OAuth.')
                .setColor('#ffaa00')
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const summary = {
            total: targetUserIds.size,
            success: 0,
            already: 0,
            missingAuth: 0,
            failed: [] as { userId: string; reason: string }[]
        };

        for (const userId of targetUserIds) {
            const member = await guild.members.fetch({ user: userId, force: false }).catch(() => null);
            if (member) {
                summary.already++;
                continue;
            }

            const token = tokenMap.get(userId);
            if (!token) {
                summary.missingAuth++;
                summary.failed.push({ userId, reason: 'Autorisation OAuth absente' });
                continue;
            }

            const result = await attemptOAuthReinvite(guild, userId, token);
            if (result.success) {
                summary.success++;
                await notifyUserReinvited(userId, guild, interaction.client);
                await logReinvite(interaction, userId);
            } else if (result.authExpired) {
                summary.missingAuth++;
                summary.failed.push({ userId, reason: 'Autorisation expirée' });
            } else {
                summary.failed.push({ userId, reason: result.error ?? 'Erreur inconnue' });
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Réinvitation groupée terminée')
            .addFields(
                { name: 'Portée', value: scope === 'everyone' ? 'Tous les utilisateurs connus' : 'Clients enregistrés', inline: true },
                { name: 'Total ciblés', value: `${summary.total}`, inline: true },
                { name: 'Réinvités', value: `${summary.success}`, inline: true },
                { name: 'Déjà présents', value: `${summary.already}`, inline: true },
                { name: 'Autorisation manquante', value: `${summary.missingAuth}`, inline: true }
            )
            .setColor('#5865F2')
            .setTimestamp();

        if (summary.failed.length > 0) {
            const details = summary.failed
                .slice(0, 5)
                .map(entry => `• <@${entry.userId}> - ${entry.reason}`)
                .join('\n');
            embed.addFields({ name: `Échecs (${summary.failed.length})`, value: details });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await handleExecutionError(interaction, error);
    }
}

async function attemptOAuthReinvite(
    guild: Guild,
    userId: string,
    token: UserOAuthToken
): Promise<{ success: boolean; authExpired?: boolean; error?: string }> {
    try {
        const activeToken = await ensureValidOAuthToken(userId, token);
        const config = databaseManager.getServerConfig(guild.id);
        const roles = config?.verifiedRoleId ? [config.verifiedRoleId] : undefined;
        const result = await InviteManager.addUserViaOAuth(guild, userId, activeToken.accessToken, { roles });

        if (!result.success) {
            if (result.status === 400 || result.status === 401 || result.status === 403) {
                databaseManager.clearUserOAuthToken(userId);
                return { success: false, authExpired: true, error: result.error };
            }
            return { success: false, error: result.error };
        }
        return { success: true };
    } catch (error) {
        databaseManager.clearUserOAuthToken(userId);
        return { success: false, authExpired: true, error: error instanceof Error ? error.message : 'refresh_failed' };
    }
}

async function ensureValidOAuthToken(userId: string, token: UserOAuthToken): Promise<UserOAuthToken> {
    if (!OAuthHelper.needsRefresh(token)) {
        return token;
    }
    const refreshed = await OAuthHelper.refreshToken(token.refreshToken);
    const updatedToken: UserOAuthToken = {
        userId,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
        scope: refreshed.scope,
        updatedAt: new Date()
    };
    databaseManager.setUserOAuthToken(userId, updatedToken);
    return updatedToken;
}

async function notifyUserReinvited(userId: string, guild: Guild, client: Client): Promise<void> {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) {
        return;
    }
    const content = [
        `Salut ${user.username},`,
        '',
        `Nous venons de te réinviter automatiquement sur **${guild.name}** suite à une restauration du serveur.`,
        `Tu n'as rien à faire : tu peux rejoindre directement depuis Discord.`,
        '',
        `Si tu souhaites retirer cette autorisation, va dans **Paramètres utilisateur > Applications autorisées** et révoque l'accès de notre service.`
    ].join('\n');
    await user.send(content).catch(() => {});
}

async function logReinvite(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
    await LogManager.logMessage({
        type: 'clear',
        userId,
        channelId: interaction.channelId ?? undefined,
        data: {
            action: 'oauth_reinvite',
            triggeredBy: interaction.user.id,
            guildId: interaction.guild?.id
        }
    });
}

async function handleExecutionError(interaction: ChatInputCommandInteraction, error: unknown): Promise<void> {
    logger.error('Erreur lors de la réinvitation:', error);
    const message = '❌ Une erreur est survenue lors de la réinvitation.';
    if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    } else {
        await interaction.editReply({ content: message });
    }
}




