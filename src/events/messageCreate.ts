import { Events, Message, Client, EmbedBuilder } from 'discord.js';
import { AntiScamManager } from '../managers/antiScamManager';
import { LogManager } from '../managers/logManager';
import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';

export const name = Events.MessageCreate;

export async function execute(message: Message, client: Client) {
  if (message.author.bot) return;

  const databaseManager = new DatabaseManager();

  // Sauvegarder le message pour les logs
  if (message.guild) {
    databaseManager.saveMessage(
      message.id,
      message.author.id,
      message.channel.id,
      message.content,
      Array.from(message.attachments.values()).map(a => ({ url: a.url, name: a.name })),
      Array.from(message.embeds.values())
    );
  }

  // Vérifier si c'est une réponse à un captcha
  const config = message.guild ? databaseManager.getServerConfig(message.guild.id) : null;
  
  if (config && config.captchaChannelId === message.channel.id) {
    // C'est dans le canal de vérification, vérifier si c'est une réponse au captcha
    // Chercher un captcha actif pour cet utilisateur
    const activeCaptchas = databaseManager.getCaptchasByUser(message.author.id)
      .filter((c: any) => !c.verified && new Date(c.expiresAt) > new Date())
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const captchaData: any = activeCaptchas.length > 0 ? activeCaptchas[0] : null;
    
    if (captchaData) {
      // Utiliser le système de validation avancé
      const { AdvancedCaptchaGenerator } = await import('../utils/advancedCaptchaGenerator');
      const validation = AdvancedCaptchaGenerator.validateAdvancedCaptcha(
        message.content, 
        captchaData.code, 
        captchaData.type || 'unknown'
      );
      
      if (validation.isValid) {
        // Captcha correct !
        databaseManager.setCaptcha({
          id: captchaData.id,
          userId: captchaData.userId,
          code: captchaData.code,
          imageBuffer: Buffer.alloc(0),
          verified: true,
          createdAt: new Date(captchaData.createdAt),
          expiresAt: new Date(captchaData.expiresAt),
          type: captchaData.type
        });

        // Attribuer le rôle vérifié et supprimer le rôle "Non vérifié"
        if (config?.verifiedRoleId && message.member) {
          try {
            // Ajouter le rôle vérifié
            await message.member.roles.add(config.verifiedRoleId);
            
            // Supprimer le rôle "Non vérifié" s'il existe
            const unverifiedRole = message.guild?.roles.cache.find(role => 
              role.name.toLowerCase().includes('non vérifié') || 
              role.name.toLowerCase().includes('non-verifie') ||
              role.name.toLowerCase().includes('unverified')
            );
            
            if (unverifiedRole && message.member.roles.cache.has(unverifiedRole.id)) {
              await message.member.roles.remove(unverifiedRole);
              console.log(`Rôle "Non vérifié" supprimé de ${message.author.tag}`);
            }
            
            const successMessage = AdvancedCaptchaGenerator.getAdvancedSuccessMessage();
            await message.reply(successMessage);

            // Envoyer un DM de bienvenue avec le règlement
            try {
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('🎉 Bienvenue sur le serveur !')
                    .setDescription(`Félicitations ! Vous avez réussi la vérification et êtes maintenant membre du serveur **${message.guild?.name || 'ce serveur'}**.`)
                    .addFields(
                        { 
                            name: '📋 Règlement Important', 
                            value: '**Veuillez lire attentivement le règlement du serveur :**\n<#1429129673392001034>\n\nCe règlement est pris au sérieux et doit être respecté par tous les membres.', 
                            inline: false 
                        },
                        { 
                            name: '✅ Vérification Réussie', 
                            value: 'Vous avez prouvé que vous n\'êtes pas un bot et pouvez maintenant accéder à tous les canaux du serveur.', 
                            inline: false 
                        },
                        { 
                            name: '🛡️ Sécurité', 
                            value: 'Votre compte a été vérifié avec succès. Profitez de votre séjour sur le serveur !', 
                            inline: false 
                        }
                    )
                    .setColor('#00ff00')
                    .setThumbnail(message.guild?.iconURL() || null)
                    .setFooter({ text: 'Système de vérification automatique' })
                    .setTimestamp();

                await message.author.send({ embeds: [welcomeEmbed] });
                console.log(`[DM] Message de bienvenue envoyé à ${message.author.tag}`);
            } catch (dmError) {
                console.log(`[WARNING] Impossible d'envoyer un DM de bienvenue à ${message.author.tag}:`, dmError);
                // Le DM n'est pas critique, continuer
            }
            
            // Supprimer les messages après 7 secondes
            setTimeout(async () => {
              try {
                await message.delete();
                const reply = await message.channel.messages.fetch({ limit: 1 });
                if (reply.first()) await reply.first()!.delete();
              } catch (e) {}
            }, 7000);
          } catch (error) {
            console.error('Erreur lors de l\'attribution du rôle:', error);
            await message.reply('❌ Erreur lors de l\'attribution du rôle. Contactez un administrateur.');
          }
        }
      } else {
        // Mauvaise réponse - compter les tentatives
        const attempts = (captchaData.attempts || 0) + 1;
        const maxAttempts = 2; // Réduit à 2 pour les captchas avancés
        
        if (attempts >= maxAttempts) {
          // Trop de tentatives
          const errorMessage = AdvancedCaptchaGenerator.getAdvancedErrorMessage(
            attempts, 
            maxAttempts, 
            validation.suspiciousActivity
          );
          await message.reply(errorMessage);
          
          // Supprimer le captcha
          databaseManager.deleteCaptcha(captchaData.id);
          
          // Si activité suspecte, bannir temporairement
          if (validation.suspiciousActivity && message.member) {
            try {
              await message.member.timeout(10 * 60 * 1000, 'Activité suspecte détectée lors de la vérification');
              console.log(`Utilisateur ${message.author.tag} mis en timeout pour activité suspecte`);
            } catch (timeoutError) {
              console.error('Erreur lors du timeout:', timeoutError);
            }
          }
        } else {
          // Incrémenter les tentatives
          databaseManager.setCaptcha({
            ...captchaData,
            attempts: attempts
          });
          
          const errorMessage = AdvancedCaptchaGenerator.getAdvancedErrorMessage(
            attempts, 
            maxAttempts, 
            validation.suspiciousActivity
          );
          await message.reply(errorMessage);
        }
        
        // Supprimer les messages après 7 secondes
        setTimeout(async () => {
          try {
            await message.delete();
            const reply = await message.channel.messages.fetch({ limit: 1 });
            if (reply.first()) await reply.first()!.delete();
          } catch (e) {}
        }, 7000);
      }
    }
    
    return; // Ne pas traiter d'autres vérifications dans le canal de captcha
  }

  // Supprimer automatiquement TOUS les messages des utilisateurs dans le salon de découverte
  if (message.guild && !message.author.bot) {
    const discoveryChannel = message.guild.channels.cache.find(
      (ch) => ch.name === '👥⎸découverte' && ch.isTextBased()
    );
    
    if (discoveryChannel && message.channel.id === discoveryChannel.id) {
      try {
        // Supprimer immédiatement le message qui vient d'être envoyé
        await message.delete().catch((error) => {
          logger.warn(`[DISCOVERY] Impossible de supprimer le message ${message.id}:`, error);
        });
        
        logger.info(`[DISCOVERY] Message de ${message.author.tag} supprimé dans le salon de découverte`);
        
        // Optionnellement, supprimer aussi tous les messages précédents de cet utilisateur
        try {
          const recentMessages = await message.channel.messages.fetch({ limit: 100 });
          const userPreviousMessages = recentMessages.filter(
            (msg) => msg.author.id === message.author.id && !msg.author.bot
          );
          
          if (userPreviousMessages.size > 0) {
            const messagesToDelete = Array.from(userPreviousMessages.values());
            
            for (const msgToDelete of messagesToDelete) {
              try {
                await msgToDelete.delete();
              } catch (error) {
                logger.warn(`[DISCOVERY] Impossible de supprimer le message ${msgToDelete.id}:`, error);
              }
            }
            
            logger.info(`[DISCOVERY] ${userPreviousMessages.size} message(s) précédent(s) supprimé(s) pour ${message.author.tag}`);
          }
        } catch (error) {
          logger.error('[DISCOVERY] Erreur lors de la suppression des messages précédents:', error);
        }
      } catch (error) {
        logger.error('[DISCOVERY] Erreur lors de la suppression du message:', error);
      }
      
      // Retourner pour empêcher le traitement ultérieur du message
      return;
    }
  }


  // Vérification anti-scam
  const antiScamManager = new AntiScamManager();
  const isSuspicious = await antiScamManager.checkMessage(message);
  if (isSuspicious) return;
}

