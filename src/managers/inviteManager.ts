import { Client, Guild, Invite, GuildMember } from 'discord.js';
import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';
import axios from 'axios';

export interface InviteData {
  code: string;
  inviterId: string;
  uses: number;
  maxUses: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  temporary: boolean;
}

export interface MemberInviteData {
  userId: string;
  inviteCode: string;
  inviterId: string;
  joinedAt: Date;
}

export class InviteManager {
  private static client: Client | null = null;
  private static databaseManager: DatabaseManager = new DatabaseManager();
  private static inviteCache: Map<string, Map<string, InviteData>> = new Map();

  static async initialize(client: Client) {
    InviteManager.client = client;
    await InviteManager.refreshInvites();
    
    setInterval(() => {
      InviteManager.refreshInvites().catch(err => {
        logger.error('Erreur lors du rafraîchissement des invitations:', err);
      });
    }, 60000);
  }

  static async refreshInvites(): Promise<void> {
    if (!InviteManager.client) return;

    for (const guild of InviteManager.client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        const inviteMap = new Map<string, InviteData>();

        for (const invite of invites.values()) {
          inviteMap.set(invite.code, {
            code: invite.code,
            inviterId: invite.inviter?.id || 'unknown',
            uses: invite.uses || 0,
            maxUses: invite.maxUses,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt || new Date(),
            temporary: invite.temporary || false
          });
        }

        InviteManager.inviteCache.set(guild.id, inviteMap);
        logger.debug(`Invitations rafraîchies pour ${guild.name}: ${invites.size} invitations`);
      } catch (error) {
        logger.error(`Erreur lors du rafraîchissement des invitations pour ${guild.name}:`, error);
      }
    }
  }

  static async trackMemberJoin(member: GuildMember): Promise<string | null> {
    if (!InviteManager.client) return null;

    const guild = member.guild;
    const oldInvites = InviteManager.inviteCache.get(guild.id);
    
    if (!oldInvites) {
      await InviteManager.refreshInvites();
      return null;
    }

    try {
      const newInvites = await guild.invites.fetch();
      const newInviteMap = InviteManager.inviteCache.get(guild.id) || new Map();

      for (const newInvite of newInvites.values()) {
        const oldInvite = oldInvites.get(newInvite.code);
        
        if (oldInvite && (newInvite.uses || 0) > oldInvite.uses) {
          const inviterId = newInvite.inviter?.id || 'unknown';
          
          const memberInviteData: MemberInviteData = {
            userId: member.id,
            inviteCode: newInvite.code,
            inviterId: inviterId,
            joinedAt: new Date()
          };

          InviteManager.saveMemberInvite(memberInviteData);
          
          newInviteMap.set(newInvite.code, {
            code: newInvite.code,
            inviterId: inviterId,
            uses: newInvite.uses || 0,
            maxUses: newInvite.maxUses,
            expiresAt: newInvite.expiresAt,
            createdAt: newInvite.createdAt || new Date(),
            temporary: newInvite.temporary || false
          });

          InviteManager.inviteCache.set(guild.id, newInviteMap);
          
          logger.info(`Membre ${member.user.tag} a rejoint via l'invitation ${newInvite.code} de ${newInvite.inviter?.tag || 'Inconnu'}`);
          
          return inviterId;
        }
      }

      await InviteManager.refreshInvites();
      return null;
    } catch (error) {
      logger.error('Erreur lors du suivi de l\'arrivée du membre:', error);
      return null;
    }
  }

  private static saveMemberInvite(data: MemberInviteData): void {
    try {
      const db = InviteManager.databaseManager as any;
      if (!db || !db.data) {
        logger.warn('DatabaseManager non initialisé');
        return;
      }

      if (!db.data.memberInvites) {
        db.data.memberInvites = {};
      }

      if (!db.data.memberInvites[data.userId]) {
        db.data.memberInvites[data.userId] = [];
      }

      db.data.memberInvites[data.userId].push(data);
      db.forceSave();
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde de l\'invitation:', error);
    }
  }

  static getMemberInvite(userId: string, index: number = -1): MemberInviteData | null {
    const db = InviteManager.databaseManager as any;
    if (!db.data || !db.data.memberInvites) return null;

    const invites = db.data.memberInvites[userId];
    if (!invites || invites.length === 0) return null;

    const position = index >= 0 ? index : invites.length - 1;
    return invites[position];
  }

  static async createReinviteLink(guild: Guild, userId: string): Promise<string | null> {
    const memberInvite = InviteManager.getMemberInvite(userId);
    
    if (!memberInvite) {
      logger.warn(`Aucune invitation trouvée pour l'utilisateur ${userId}`);
      return null;
    }

    try {
      const inviter = await guild.members.fetch(memberInvite.inviterId).catch(() => null);
      if (!inviter) {
        logger.warn(`L'inviteur ${memberInvite.inviterId} n'est plus sur le serveur`);
        return null;
      }

      const invites = await guild.invites.fetch();
      const originalInvite = invites.find(inv => inv.code === memberInvite.inviteCode);
      
      if (originalInvite && !originalInvite.expiresAt) {
        return `https://discord.gg/${originalInvite.code}`;
      }

      const newInvite = await guild.invites.create(guild.systemChannelId || guild.channels.cache.first()?.id || '', {
        maxUses: 1,
        unique: true,
        temporary: false
      });

      logger.info(`Nouvelle invitation créée pour ${userId}: ${newInvite.code}`);
      return `https://discord.gg/${newInvite.code}`;
    } catch (error) {
      logger.error('Erreur lors de la création d\'une nouvelle invitation:', error);
      return null;
    }
  }

  static async getInviteStats(guild: Guild): Promise<Map<string, number>> {
    const stats = new Map<string, number>();
    const db = InviteManager.databaseManager as any;

    if (!db.data || !db.data.memberInvites) return stats;

    for (const userId in db.data.memberInvites) {
      const invites = db.data.memberInvites[userId];
      if (invites && invites.length > 0) {
        const lastInvite = invites[invites.length - 1];
        const count = stats.get(lastInvite.inviterId) || 0;
        stats.set(lastInvite.inviterId, count + 1);
      }
    }

    return stats;
  }

  static getTrackedUserIds(): string[] {
    const db = InviteManager.databaseManager as any;
    if (!db.data || !db.data.memberInvites) {
      return [];
    }
    return Object.keys(db.data.memberInvites);
  }

  static async addUserViaOAuth(
    guild: Guild,
    userId: string,
    accessToken: string,
    options?: { roles?: string[] }
  ): Promise<{ success: boolean; status: number; error?: string }> {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN manquant pour l\'ajout via OAuth.');
    }

    try {
      const response = await axios.put(
        `https://discord.com/api/v10/guilds/${guild.id}/members/${userId}`,
        {
          access_token: accessToken,
          roles: options?.roles
        },
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true
        }
      );

      if (response.status === 201 || response.status === 204) {
        return { success: true, status: response.status };
      }

      const errorMessage = response.data?.message || 'Unknown error';
      return {
        success: false,
        status: response.status,
        error: `${response.data?.code ?? response.status}: ${errorMessage}`
      };
    } catch (error: any) {
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message || 'Unknown error';
      return { success: false, status, error: message };
    }
  }
}

