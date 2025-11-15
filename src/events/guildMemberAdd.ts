import { Events, GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { LogManager } from '../managers/logManager';
import { DatabaseManager } from '../database/databaseManager';
import { InviteManager } from '../managers/inviteManager';
import { logger } from '../utils/logger';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
  const databaseManager = new DatabaseManager();
  
  // Déterminer qui a invité le membre via InviteManager
  const invitedBy = await InviteManager.trackMemberJoin(member);
  
  // Logger l'arrivée du membre avec l'info de l'inviteur
  await LogManager.logMessage({
    type: 'member_join',
    userId: member.user.id,
    moderatorId: invitedBy || undefined,
    data: {
      username: member.user.username,
      discriminator: member.user.discriminator,
      accountCreated: member.user.createdAt.toISOString(),
      invitedBy: invitedBy || 'Inconnu'
    }
  });

  // Créer ou mettre à jour les données utilisateur
  const userData = {
    id: member.id,
    username: member.user.username,
    discriminator: member.user.discriminator,
    avatar: member.user.avatar || undefined,
    joinedAt: new Date(),
    lastActive: new Date(),
    warnings: 0,
    isBanned: false,
    invitedBy: invitedBy || undefined
  };

  databaseManager.setUser(userData);

  // Attribuer automatiquement le rôle "Non vérifié"
  const config = databaseManager.getServerConfig(member.guild.id);
  if (config?.autoRoleId) {
    try {
      await member.roles.add(config.autoRoleId);
      logger.info(`Rôle automatique attribué à ${member.user.tag}`);
    } catch (error) {
      logger.error('Erreur lors de l\'attribution du rôle automatique:', error);
    }
  }

  // Envoyer un message de bienvenue avec l'info de l'inviteur
  if (config?.logChannelId) {
    const logChannel = member.guild.channels.cache.get(config.logChannelId);
    if (logChannel?.isTextBased()) {
      const inviterMention = invitedBy ? `<@${invitedBy}>` : 'Invitation inconnue';
      
      const embed = new EmbedBuilder()
        .setTitle('👋 Nouveau membre')
        .setDescription(`${member.user} a rejoint le serveur.`)
        .addFields(
          { name: 'Utilisateur', value: `${member.user.tag}`, inline: true },
          { name: 'ID', value: member.user.id, inline: true },
          { name: 'Invité par', value: inviterMention, inline: true },
          { name: 'Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false },
          { name: 'Membres', value: `${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setColor('#00ff00')
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  }
}

