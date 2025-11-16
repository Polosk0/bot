import express, { Request, Response, NextFunction } from 'express';
import { Client, GuildMember, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/databaseManager';
import { LogManager } from '../managers/logManager';
import { WebhookManager } from '../managers/webhookManager';
import { CurrencyManager } from '../managers/currencyManager';
import { logger } from './logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface VerificationWebhook {
  userId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  guildId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
}

export class HttpServer {
  private app: express.Application;
  private client: Client;
  private databaseManager: DatabaseManager;
  private port: number;
  private apiKey: string;
  private static readonly PORT_RETRY_LIMIT = 5;

  constructor(client: Client, port: number = 3001, apiKey: string) {
    this.app = express();
    this.client = client;
    this.databaseManager = new DatabaseManager();
    this.port = port;
    this.apiKey = apiKey;
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use(express.json());

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const isHealth = req.path === '/health';
      const isLogDownload = req.path.startsWith('/api/logs/download');
      const isVerification = req.path === '/api/verify' && req.method === 'POST';
      const isCurrencyBalance = req.path === '/api/currency/balance' && req.method === 'GET';
      if (isHealth || isLogDownload || isVerification || isCurrencyBalance) {
        return next();
      }

      const providedKey = req.headers['x-api-key'] || req.query.apiKey;
      if (providedKey !== this.apiKey) {
        return res.status(401).json({ success: false, message: 'Clé API invalide' });
      }
      next();
    });

    this.app.post('/api/verify', async (req: Request, res: Response) => {
      try {
        const { userId, username, discriminator, avatar, guildId } = req.body as VerificationWebhook;

        if (!userId || !guildId) {
          return res.status(400).json({ 
            success: false, 
            message: 'userId et guildId sont requis' 
          });
        }

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ 
            success: false, 
            message: 'Serveur non trouvé' 
          });
        }

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
          return res.status(404).json({ 
            success: false, 
            message: 'Membre non trouvé sur le serveur' 
          });
        }

        const config = this.databaseManager.getServerConfig(guildId);
        if (!config || !config.verifiedRoleId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Configuration de vérification non trouvée. Utilisez /verify setup' 
          });
        }

        const verifiedRole = guild.roles.cache.get(config.verifiedRoleId);
        if (!verifiedRole) {
          return res.status(404).json({ 
            success: false, 
            message: 'Rôle vérifié non trouvé' 
          });
        }

        if (member.roles.cache.has(verifiedRole.id)) {
          return res.status(200).json({ 
            success: true, 
            message: 'Utilisateur déjà vérifié' 
          });
        }

        logger.info(`[VERIFY] Vérification automatique pour ${member.user.tag} (${member.id})`);
        
        const botMember = await guild.members.fetch(this.client.user!.id);
        const botHighestRole = botMember.roles.highest;
        const targetRolePosition = verifiedRole.position;
        
        logger.info(`[VERIFY] Position du rôle bot: ${botHighestRole.position}, Position du rôle cible: ${targetRolePosition}`);
        
        if (botHighestRole.position <= targetRolePosition) {
          logger.error(`[VERIFY] ❌ Le bot ne peut pas attribuer ce rôle (position trop basse)`);
          return res.status(403).json({ 
            success: false, 
            message: 'Le bot ne peut pas attribuer ce rôle. Le rôle du bot doit être plus haut que le rôle vérifié dans la hiérarchie Discord.' 
          });
        }
        
        if (!guild.members.me?.permissions.has('ManageRoles')) {
          logger.error(`[VERIFY] ❌ Le bot n'a pas la permission ManageRoles`);
          return res.status(403).json({ 
            success: false, 
            message: 'Le bot n\'a pas la permission de gérer les rôles. Vérifiez les permissions du bot.' 
          });
        }

        await member.roles.add(verifiedRole).catch(err => {
          logger.error(`[VERIFY] ❌ Erreur lors de l'ajout du rôle:`, err);
          throw err;
        });
        logger.info(`[VERIFY] ✅ Rôle ${verifiedRole.name} attribué avec succès à ${member.user.tag}`);

        if (config.unverifiedRoleId) {
          const unverifiedRole = guild.roles.cache.get(config.unverifiedRoleId);
          if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
            logger.info(`[VERIFY] Suppression du rôle non vérifié: ${unverifiedRole.name}`);
            await member.roles.remove(unverifiedRole).catch(err => {
              logger.error(`[VERIFY] ⚠️ Erreur lors de la suppression du rôle non vérifié:`, err);
            });
          }
        }

        await LogManager.logMessage({
          type: 'verification',
          userId: member.id,
          data: {
            roleId: verifiedRole.id,
            roleName: verifiedRole.name,
            method: 'web_oauth2',
            platform: 'Web'
          }
        });

        if (req.body.accessToken && req.body.refreshToken) {
          const expiresIn = Number(req.body.expiresIn ?? 3600);
          const expiresAt = new Date(Date.now() + expiresIn * 1000);
          const scope = typeof req.body.scope === 'string' ? req.body.scope.split(' ') : [];
          this.databaseManager.setUserOAuthToken(member.id, {
            userId: member.id,
            accessToken: req.body.accessToken,
            refreshToken: req.body.refreshToken,
            expiresAt,
            scope,
            updatedAt: new Date()
          });
          logger.info(`[VERIFY] Jeton OAuth stocké pour ${member.user.tag}`);
        }

        const useWebhook = process.env.USE_WEBHOOK_VERIFICATION === 'true';
        
        if (useWebhook && config.verificationChannelId) {
          logger.info(`[VERIFY] Envoi de la notification webhook pour ${member.user.tag}`);
          await WebhookManager.sendVerificationRequest({
            userId: member.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatar: member.user.avatar || undefined,
            guildId: guildId
          }).catch(err => {
            logger.error(`[VERIFY] ⚠️ Erreur lors de l'envoi du webhook:`, err);
          });
        }

        if (config.webhookUrl) {
          try {
            const { WebhookClient } = await import('discord.js');
            const webhook = new WebhookClient({ url: config.webhookUrl });
            
            const embed = new EmbedBuilder()
              .setTitle('✅ Vérification Réussie')
              .setDescription(`${member.user} a été vérifié avec succès via la plateforme web.`)
              .addFields(
                { name: '👤 Utilisateur', value: `${member.user.tag}`, inline: true },
                { name: '🆔 ID', value: member.user.id, inline: true },
                { name: '✅ Rôle attribué', value: `<@&${verifiedRole.id}>`, inline: true },
                { name: '🌐 Méthode', value: 'OAuth2 Web', inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
              )
              .setThumbnail(member.user.displayAvatarURL())
              .setColor('#00ff00')
              .setFooter({ 
                text: '€mynona Market • Système de vérification',
                iconURL: guild.iconURL() || undefined
              })
              .setTimestamp();

            await webhook.send({ embeds: [embed] });
            logger.info(`Log de vérification envoyé via webhook pour ${member.user.tag}`);
          } catch (error) {
            logger.error('Erreur lors de l\'envoi du log via webhook:', error);
          }
        }

        const logChannel = config.logChannelId 
          ? guild.channels.cache.get(config.logChannelId) 
          : null;

        if (logChannel && logChannel.isTextBased() && !config.webhookUrl) {
          const embed = new EmbedBuilder()
            .setTitle('✅ Vérification Réussie')
            .setDescription(`${member.user} a été vérifié avec succès via la plateforme web.`)
            .addFields(
              { name: 'Utilisateur', value: `${member.user.tag}`, inline: true },
              { name: 'ID', value: member.user.id, inline: true },
              { name: 'Rôle attribué', value: `<@&${verifiedRole.id}>`, inline: true },
              { name: 'Méthode', value: 'OAuth2 Web', inline: true },
              { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setColor('#00ff00')
            .setTimestamp();

          await logChannel.send({ embeds: [embed] });
        }

        logger.info(`Utilisateur ${member.user.tag} (${member.id}) vérifié avec succès`);

        res.json({ 
          success: true, 
          message: 'Vérification réussie',
          userId: member.id,
          username: member.user.tag
        });

      } catch (error) {
        logger.error('Erreur lors de la vérification:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de la vérification',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    });

    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        success: true, 
        status: 'online',
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/api', (req: Request, res: Response) => {
      res.json({ 
        success: true,
        message: 'API du bot Discord',
        endpoints: {
          'GET /health': 'Vérifier le statut du serveur (pas de clé API requise)',
          'POST /api/verify': 'Vérifier un utilisateur via OAuth2 (clé API requise)',
          'GET /api/logs/download/:filename': 'Télécharger un fichier de log (pas de clé API requise)',
          'GET /api/currency/balance': 'Obtenir le solde d\'un utilisateur (pas de clé API requise)',
          'POST /api/currency/spend': 'Dépenser des coins (clé API requise)',
          'POST /api/rewards/claim': 'Enregistrer une récompense (clé API requise)'
        },
        note: 'Pour utiliser /api/verify, envoyez la clé API via le header "x-api-key" ou le paramètre "apiKey"'
      });
    });

    this.app.get('/api/logs/download/:filename', (req: Request, res: Response) => {
      const filename = req.params.filename;
      const logsDir = join(__dirname, '../../logs/exported');
      const filePath = join(logsDir, filename);

      if (!existsSync(filePath)) {
        return res.status(404).json({ 
          success: false, 
          message: 'Fichier de log non trouvé' 
        });
      }

      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(fileContent);
        logger.info(`Fichier de log téléchargé: ${filename}`);
      } catch (error) {
        logger.error('Erreur lors du téléchargement du log:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de la lecture du fichier' 
        });
      }
    });

    this.app.get('/api/currency/balance', async (req: Request, res: Response) => {
      try {
        const userId = req.query.userId as string;
        
        if (!userId) {
          return res.status(400).json({ 
            success: false, 
            message: 'userId est requis' 
          });
        }

        const balance = CurrencyManager.getBalance(userId);
        const totalInvites = await CurrencyManager.getTotalInvites(userId);
        
        res.json({ 
          success: true, 
          balance,
          totalInvites
        });
      } catch (error) {
        logger.error('Erreur lors de la récupération du solde:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de la récupération du solde' 
        });
      }
    });

    this.app.post('/api/currency/spend', async (req: Request, res: Response) => {
      try {
        const { userId, amount, reason } = req.body;
        
        if (!userId || !amount || !reason) {
          return res.status(400).json({ 
            success: false, 
            message: 'userId, amount et reason sont requis' 
          });
        }

        const success = CurrencyManager.spendCoins(userId, amount, reason);
        
        if (!success) {
          return res.status(400).json({ 
            success: false, 
            message: 'Solde insuffisant ou erreur lors de la dépense' 
          });
        }

        const newBalance = CurrencyManager.getBalance(userId);
        
        res.json({ 
          success: true, 
          newBalance,
          amountSpent: amount
        });
      } catch (error) {
        logger.error('Erreur lors de la dépense:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de la dépense' 
        });
      }
    });

    this.app.post('/api/rewards/claim', async (req: Request, res: Response) => {
      try {
        const { userId, rewardId, rewardName, rewardType, discount } = req.body;
        
        if (!userId || !rewardId || !rewardName) {
          return res.status(400).json({ 
            success: false, 
            message: 'userId, rewardId et rewardName sont requis' 
          });
        }

        logger.info(`[REWARDS] Récompense réclamée: ${rewardName} (${rewardId}) par utilisateur ${userId}`);
        
        const transaction: any = {
          id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          type: 'reward',
          amount: 0,
          reason: `Récompense: ${rewardName}`,
          metadata: {
            rewardId,
            rewardName,
            rewardType,
            discount
          },
          createdAt: new Date()
        };

        this.databaseManager.addCurrencyTransaction(transaction);
        
        res.json({ 
          success: true, 
          message: 'Récompense enregistrée',
          reward: {
            id: rewardId,
            name: rewardName,
            userId,
            type: rewardType,
            discount,
            claimedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('[REWARDS] Erreur:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Erreur serveur' 
        });
      }
    });

    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ success: false, message: 'Route non trouvée' });
    });
  }

  public start(): void {
    this.startListening(this.port);
  }

  private startListening(port: number, attempt: number = 0): void {
    const server = this.app.listen(port, () => {
      this.port = port;
      logger.info(`🌐 Serveur HTTP démarré sur le port ${this.port}`);
      const serverUrl = process.env.WEB_VERIFICATION_URL || 'https://emynona.shop';
      logger.info(`📡 Webhook de vérification: ${serverUrl}/api/verify`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE' && attempt < HttpServer.PORT_RETRY_LIMIT) {
        const nextPort = port + 1;
        logger.warn(`[HTTP] Port ${port} déjà utilisé. Tentative sur ${nextPort} (essai ${attempt + 1}/${HttpServer.PORT_RETRY_LIMIT}).`);
        if (server.listening) {
          server.close(() => this.startListening(nextPort, attempt + 1));
        } else {
          this.startListening(nextPort, attempt + 1);
        }
        return;
      }

      logger.error(`[HTTP] Impossible de démarrer le serveur HTTP: ${error.message}`);
    });
  }
}

