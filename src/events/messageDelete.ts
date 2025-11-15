import { Events, Message, EmbedBuilder } from 'discord.js';
import { LogManager } from '../managers/logManager';
import { DatabaseManager } from '../database/databaseManager';

export const name = Events.MessageDelete;

export async function execute(message: Message) {
  if (message.author?.bot) return;

  const databaseManager = new DatabaseManager();
  
  // Récupérer le message sauvegardé
  const savedMessage = databaseManager.getMessage(message.id);
  
  // Logger la suppression avec le contenu du message
  await LogManager.logMessage({
    type: 'message_delete',
    userId: message.author?.id || savedMessage?.authorId || 'Inconnu',
    channelId: message.channel.id,
    reason: 'Message supprimé',
    data: {
      content: savedMessage?.content || message.content || 'Contenu indisponible',
      attachments: savedMessage?.attachments || [],
      embeds: savedMessage?.embeds || []
    }
  });

  // Envoyer dans le canal de logs si configuré
  if (message.guild) {
    const config = databaseManager.getServerConfig(message.guild.id);
    if (config?.logChannelId) {
      const logChannel = message.guild.channels.cache.get(config.logChannelId);
      if (logChannel?.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('🗑️ Message supprimé')
          .setDescription(`Un message a été supprimé dans ${message.channel}`)
          .addFields(
            { name: 'Auteur', value: message.author?.toString() || 'Inconnu', inline: true },
            { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Contenu', value: (savedMessage?.content || message.content || 'Vide').substring(0, 1024), inline: false }
          )
          .setColor('#ff0000')
          .setTimestamp();

        if (savedMessage?.attachments && savedMessage.attachments.length > 0) {
          embed.addFields({
            name: 'Pièces jointes',
            value: savedMessage.attachments.map((a: any) => `[${a.name}](${a.url})`).join('\n').substring(0, 1024),
            inline: false
          });
        }

        await logChannel.send({ embeds: [embed] });
      }
    }
  }
}
