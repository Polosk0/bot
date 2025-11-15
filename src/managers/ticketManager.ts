import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  TextChannel,
  GuildMember,
  PermissionFlagsBits,
  ChannelType,
  Guild,
  CategoryChannel
} from 'discord.js';
import { DatabaseManager } from '../database/databaseManager';
import { LogManager } from './logManager';
import { logger } from '../utils/logger';

export class TicketManager {
  private databaseManager: DatabaseManager;

  constructor() {
    this.databaseManager = new DatabaseManager();
  }

  async createTicket(guild: Guild, member: GuildMember, category: 'refund' | 'boxing'): Promise<TextChannel | null> {
    try {
      // Récupérer la configuration du serveur
      const config = this.databaseManager.getServerConfig(guild.id);
      
      if (!config) {
        logger.error('Configuration du serveur introuvable');
        return null;
      }

      // Déterminer la catégorie à utiliser
      const categoryId = category === 'refund' 
        ? config.ticketCategoryRefundId 
        : config.ticketCategoryBoxingId;

      if (!categoryId) {
        logger.error(`Catégorie ${category} non configurée`);
        return null;
      }

      // Vérifier si l'utilisateur a déjà un ticket ouvert DANS CETTE CATÉGORIE
      const existingTickets = this.databaseManager.getTicketsByUser(member.id);
      const openTicketsInCategory = existingTickets.filter(t => t.status === 'open' && t.category === category);
      
      // Vérifier si les canaux existent encore sur Discord
      for (const ticket of openTicketsInCategory) {
        const channel = guild.channels.cache.get(ticket.channelId);
        
        if (!channel) {
          // Le canal n'existe plus, nettoyer le ticket orphelin
          logger.warn(`Ticket orphelin détecté: ${ticket.id} - canal supprimé mais ticket toujours ouvert`);
          this.databaseManager.updateTicket(ticket.id, {
            status: 'closed',
            closedAt: new Date()
          });
        } else {
          // Le canal existe encore, l'utilisateur a vraiment un ticket ouvert
          logger.warn(`L'utilisateur ${member.id} a déjà un ticket ${category} ouvert`);
          return null;
        }
      }

      // Récupérer la catégorie
      const categoryChannel = guild.channels.cache.get(categoryId) as CategoryChannel;
      
      if (!categoryChannel) {
        logger.error(`Catégorie ${categoryId} introuvable`);
        return null;
      }

      // Créer le canal du ticket
      const ticketChannel = await guild.channels.create({
        name: `ticket-${member.user.username}-${category}`,
        type: ChannelType.GuildText,
        parent: categoryChannel.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      });

      // Enregistrer le ticket dans la base de données
      this.databaseManager.setTicket({
        id: ticketChannel.id,
        userId: member.id,
        channelId: ticketChannel.id,
        category: category,
        status: 'open',
        createdAt: new Date()
      });

      // Créer l'embed du ticket
      const embed = new EmbedBuilder()
        .setTitle(`🎫 Ticket ${category.toUpperCase()}`)
        .setDescription(`Bienvenue ${member}!\n\nMerci d'avoir créé un ticket. Un membre du staff vous répondra dès que possible.\n\n**Catégorie:** ${category === 'refund' ? '💰 Refund' : '🥊 Boxing'}`)
        .setColor('#0099ff')
        .setFooter({ text: 'Pour fermer ce ticket, cliquez sur le bouton ci-dessous' })
        .setTimestamp();

      // Bouton pour fermer le ticket
      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(closeButton);

      await ticketChannel.send({
        content: `${member}`,
        embeds: [embed],
        components: [row]
      });

      // Logger la création
      await LogManager.logMessage({
        type: 'channel_create',
        userId: member.id,
        channelId: ticketChannel.id,
        reason: `Ticket ${category} créé`,
        data: {
          category: category,
          ticketId: ticketChannel.id
        }
      });

      logger.info(`Ticket créé: ${ticketChannel.id} pour ${member.user.tag}`);
      return ticketChannel;

    } catch (error) {
      logger.error('Erreur lors de la création du ticket:', error);
      return null;
    }
  }

  async closeTicket(ticketChannel: TextChannel, closedBy: GuildMember): Promise<boolean> {
    try {
      // Récupérer le ticket de la base de données
      const ticket = this.databaseManager.getTicket(ticketChannel.id);
      
      if (!ticket) {
        logger.error('Ticket introuvable dans la base de données');
        return false;
      }

      // Mettre à jour le ticket
      this.databaseManager.updateTicket(ticketChannel.id, {
        status: 'closed',
        closedAt: new Date(),
        closedBy: closedBy.id
      });

      // Créer un transcript simple (liste des messages)
      const messages = await ticketChannel.messages.fetch({ limit: 100 });
      const transcript = messages.reverse().map(m => 
        `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`
      ).join('\n');

      // Envoyer le transcript à l'utilisateur du ticket
      const ticketOwner = await ticketChannel.guild.members.fetch(ticket.userId).catch(() => null);
      
      if (ticketOwner) {
        try {
          const transcriptEmbed = new EmbedBuilder()
            .setTitle('📋 Transcript de votre ticket')
            .setDescription(`Votre ticket **${ticket.category}** a été fermé.`)
            .addFields(
              { name: 'Fermé par', value: `${closedBy.user.tag}`, inline: true },
              { name: 'Date de fermeture', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setColor('#ff0000')
            .setTimestamp();

          await ticketOwner.send({ embeds: [transcriptEmbed] });
        } catch (error) {
          logger.warn('Impossible d\'envoyer le transcript à l\'utilisateur');
        }
      }

      // Message de fermeture
      const closeEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket fermé')
        .setDescription(`Ce ticket a été fermé par ${closedBy}.\nSuppression dans 5 secondes...`)
        .setColor('#ff0000')
        .setTimestamp();

      await ticketChannel.send({ embeds: [closeEmbed] });

      // Logger la fermeture
      await LogManager.logMessage({
        type: 'channel_delete',
        userId: ticket.userId,
        moderatorId: closedBy.id,
        channelId: ticketChannel.id,
        reason: 'Ticket fermé',
        data: {
          category: ticket.category,
          ticketId: ticketChannel.id,
          transcript: transcript.substring(0, 1000) // Limiter la taille
        }
      });

      // Supprimer le canal après 5 secondes
      setTimeout(async () => {
        try {
          await ticketChannel.delete();
          logger.info(`Ticket supprimé: ${ticketChannel.id}`);
        } catch (error) {
          logger.error('Erreur lors de la suppression du ticket:', error);
        }
      }, 5000);

      return true;

    } catch (error) {
      logger.error('Erreur lors de la fermeture du ticket:', error);
      return false;
    }
  }

  async getTicketInfo(ticketChannel: TextChannel): Promise<any> {
    const ticket = this.databaseManager.getTicket(ticketChannel.id);
    
    if (!ticket) {
      return null;
    }

    const ticketOwner = await ticketChannel.guild.members.fetch(ticket.userId).catch(() => null);
    
    return {
      ...ticket,
      owner: ticketOwner
    };
  }
}
