import { Events, Message, PartialMessage, EmbedBuilder } from 'discord.js';
import { LogManager } from '../managers/logManager';
import { DatabaseManager } from '../database/databaseManager';

export const name = Events.MessageUpdate;

export async function execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const databaseManager = new DatabaseManager();

  // Mettre à jour le message dans la base de données
  if (newMessage.guild && newMessage.content) {
    databaseManager.saveMessage(
      newMessage.id,
      newMessage.author!.id,
      newMessage.channel.id,
      newMessage.content,
      Array.from(newMessage.attachments?.values() || []).map(a => ({ url: a.url, name: a.name })),
      Array.from(newMessage.embeds?.values() || [])
    );
  }

  // Logger la modification
  await LogManager.logMessage({
    type: 'message_edit',
    userId: newMessage.author?.id || 'Inconnu',
    channelId: newMessage.channel.id,
    reason: 'Message modifié',
    data: {
      oldContent: oldMessage.content || 'Indisponible',
      newContent: newMessage.content || 'Indisponible'
    }
  });

  // Envoyer dans le canal de logs si configuré
  if (newMessage.guild) {
    const config = databaseManager.getServerConfig(newMessage.guild.id);
    if (config?.logChannelId) {
      const logChannel = newMessage.guild.channels.cache.get(config.logChannelId);
      if (logChannel?.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('✏️ Message modifié')
          .setDescription(`Un message a été modifié dans ${newMessage.channel}`)
          .addFields(
            { name: 'Auteur', value: newMessage.author?.toString() || 'Inconnu', inline: true },
            { name: 'Canal', value: `<#${newMessage.channel.id}>`, inline: true },
            { name: 'Avant', value: (oldMessage.content || 'Vide').substring(0, 1024), inline: false },
            { name: 'Après', value: (newMessage.content || 'Vide').substring(0, 1024), inline: false }
          )
          .setColor('#ffa500')
          .setTimestamp();

        if (newMessage.url) {
          embed.addFields({ name: 'Lien', value: newMessage.url, inline: false });
        }

        await logChannel.send({ embeds: [embed] });
      }
    }
  }
}
