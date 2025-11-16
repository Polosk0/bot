import { DatabaseManager } from '../database/databaseManager';
import { CurrencyTransaction, InviteRewardTier, LoyaltyRewardTier } from '../types/database';
import { logger } from '../utils/logger';
import { InviteManager } from './inviteManager';

export class CurrencyManager {
  private static databaseManager: DatabaseManager = new DatabaseManager();

  private static readonly INVITE_REWARD_TIERS: InviteRewardTier[] = [
    { tier: 1, invitesRequired: 5, coinsReward: 50, name: 'Bronze' },
    { tier: 2, invitesRequired: 10, coinsReward: 150, name: 'Argent' },
    { tier: 3, invitesRequired: 25, coinsReward: 500, name: 'Or' },
    { tier: 4, invitesRequired: 50, coinsReward: 1250, name: 'Platine' },
    { tier: 5, invitesRequired: 100, coinsReward: 3000, name: 'Diamant' },
    { tier: 6, invitesRequired: 250, coinsReward: 10000, name: 'Légende' },
    { tier: 7, invitesRequired: 500, coinsReward: 25000, name: 'Mythique' }
  ];

  private static readonly LOYALTY_REWARD_TIERS: LoyaltyRewardTier[] = [
    { tier: 1, rankFactorRequired: 10, coinsReward: 100, name: 'Client Débutant' },
    { tier: 2, rankFactorRequired: 50, coinsReward: 500, name: 'Client Régulier' },
    { tier: 3, rankFactorRequired: 100, coinsReward: 1500, name: 'Client Fidèle' },
    { tier: 4, rankFactorRequired: 250, coinsReward: 4000, name: 'Client Premium' },
    { tier: 5, rankFactorRequired: 500, coinsReward: 10000, name: 'Client VIP' },
    { tier: 6, rankFactorRequired: 1000, coinsReward: 25000, name: 'Client Élite' },
    { tier: 7, rankFactorRequired: 2500, coinsReward: 75000, name: 'Client Légendaire' }
  ];

  static getBalance(userId: string): number {
    const user = CurrencyManager.databaseManager.getUser(userId);
    return user?.emynonaCoins || 0;
  }

  static addCoins(userId: string, amount: number, reason: string, metadata?: any): boolean {
    if (amount <= 0) {
      logger.warn(`Tentative d'ajout de ${amount} coins (montant invalide) pour ${userId}`);
      return false;
    }

    const user = CurrencyManager.databaseManager.getUser(userId);
    if (!user) {
      logger.warn(`Utilisateur ${userId} non trouvé lors de l'ajout de coins`);
      return false;
    }

    const newBalance = (user.emynonaCoins || 0) + amount;
    
    CurrencyManager.databaseManager.updateUser(userId, {
      emynonaCoins: newBalance
    });

    const transaction: CurrencyTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'earn',
      amount,
      reason,
      metadata,
      createdAt: new Date()
    };

    CurrencyManager.databaseManager.addCurrencyTransaction(transaction);
    logger.info(`Ajouté ${amount} coins à ${userId}. Nouveau solde: ${newBalance}. Raison: ${reason}`);
    
    return true;
  }

  static spendCoins(userId: string, amount: number, reason: string, metadata?: any): boolean {
    if (amount <= 0) {
      logger.warn(`Tentative de dépense de ${amount} coins (montant invalide) pour ${userId}`);
      return false;
    }

    const user = CurrencyManager.databaseManager.getUser(userId);
    if (!user) {
      logger.warn(`Utilisateur ${userId} non trouvé lors de la dépense de coins`);
      return false;
    }

    const currentBalance = user.emynonaCoins || 0;
    if (currentBalance < amount) {
      logger.warn(`Solde insuffisant pour ${userId}. Solde: ${currentBalance}, Tentative: ${amount}`);
      return false;
    }

    const newBalance = currentBalance - amount;
    
    CurrencyManager.databaseManager.updateUser(userId, {
      emynonaCoins: newBalance
    });

    const transaction: CurrencyTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'spend',
      amount: -amount,
      reason,
      metadata,
      createdAt: new Date()
    };

    CurrencyManager.databaseManager.addCurrencyTransaction(transaction);
    logger.info(`Dépensé ${amount} coins de ${userId}. Nouveau solde: ${newBalance}. Raison: ${reason}`);
    
    return true;
  }

  static async checkAndRewardInvites(userId: string): Promise<{ rewarded: boolean; tier?: InviteRewardTier; coins?: number }> {
    const user = CurrencyManager.databaseManager.getUser(userId);
    if (!user) {
      return { rewarded: false };
    }

    const totalInvites = await CurrencyManager.getTotalInvites(userId);
    const lastClaimedTier = user.lastInviteRewardClaimed || 0;

    for (const tier of CurrencyManager.INVITE_REWARD_TIERS) {
      if (tier.tier > lastClaimedTier && totalInvites >= tier.invitesRequired) {
        CurrencyManager.addCoins(
          userId,
          tier.coinsReward,
          `Récompense d'invitation - Tier ${tier.tier} (${tier.name})`,
          { tier: tier.tier, invitesRequired: tier.invitesRequired }
        );

        CurrencyManager.databaseManager.updateUser(userId, {
          totalInvites,
          lastInviteRewardClaimed: tier.tier
        });

        logger.info(`Récompense d'invitation attribuée: Tier ${tier.tier} (${tier.coinsReward} coins) à ${userId}`);
        
        return { rewarded: true, tier, coins: tier.coinsReward };
      }
    }

    return { rewarded: false };
  }

  static async getTotalInvites(userId: string): Promise<number> {
    const db = CurrencyManager.databaseManager as any;
    if (!db.data || !db.data.memberInvites) {
      return 0;
    }

    let count = 0;
    for (const memberId in db.data.memberInvites) {
      const invites = db.data.memberInvites[memberId];
      if (invites && invites.length > 0) {
        for (const invite of invites) {
          if (invite.inviterId === userId) {
            count++;
          }
        }
      }
    }

    return count;
  }

  static checkAndRewardLoyalty(userId: string, rankFactor: number): Promise<{ rewarded: boolean; tier?: LoyaltyRewardTier; coins?: number }> {
    return new Promise((resolve) => {
      const user = CurrencyManager.databaseManager.getUser(userId);
      if (!user) {
        resolve({ rewarded: false });
        return;
      }

      const currentRF = user.rankFactor || 0;
      const newRF = Math.max(currentRF, rankFactor);

      for (const tier of CurrencyManager.LOYALTY_REWARD_TIERS) {
        if (newRF >= tier.rankFactorRequired && (!user.lastInviteRewardClaimed || tier.tier > user.lastInviteRewardClaimed)) {
          CurrencyManager.addCoins(
            userId,
            tier.coinsReward,
            `Récompense de fidélité - Tier ${tier.tier} (${tier.name})`,
            { tier: tier.tier, rankFactorRequired: tier.rankFactorRequired }
          );

          CurrencyManager.databaseManager.updateUser(userId, {
            rankFactor: newRF
          });

          logger.info(`Récompense de fidélité attribuée: Tier ${tier.tier} (${tier.coinsReward} coins) à ${userId}`);
          
          resolve({ rewarded: true, tier, coins: tier.coinsReward });
          return;
        }
      }

      if (newRF > currentRF) {
        CurrencyManager.databaseManager.updateUser(userId, {
          rankFactor: newRF
        });
      }

      resolve({ rewarded: false });
    });
  }

  static getInviteRewardTiers(): InviteRewardTier[] {
    return [...CurrencyManager.INVITE_REWARD_TIERS];
  }

  static getLoyaltyRewardTiers(): LoyaltyRewardTier[] {
    return [...CurrencyManager.LOYALTY_REWARD_TIERS];
  }

  static async getNextInviteTier(userId: string): Promise<{ tier: InviteRewardTier | null; progress: number; totalInvites: number }> {
    const totalInvites = await CurrencyManager.getTotalInvites(userId);
    const user = CurrencyManager.databaseManager.getUser(userId);
    const lastClaimedTier = user?.lastInviteRewardClaimed || 0;

    for (const tier of CurrencyManager.INVITE_REWARD_TIERS) {
      if (tier.tier > lastClaimedTier) {
        return {
          tier,
          progress: totalInvites,
          totalInvites
        };
      }
    }

    return {
      tier: null,
      progress: totalInvites,
      totalInvites
    };
  }

  static getNextLoyaltyTier(userId: string): { tier: LoyaltyRewardTier | null; progress: number } {
    const user = CurrencyManager.databaseManager.getUser(userId);
    if (!user) {
      return { tier: null, progress: 0 };
    }

    const currentRF = user.rankFactor || 0;

    for (const tier of CurrencyManager.LOYALTY_REWARD_TIERS) {
      if (currentRF < tier.rankFactorRequired) {
        return {
          tier,
          progress: currentRF
        };
      }
    }

    return {
      tier: null,
      progress: currentRF
    };
  }

  static getTransactionHistory(userId: string, limit: number = 50): CurrencyTransaction[] {
    return CurrencyManager.databaseManager.getCurrencyTransactionsByUser(userId).slice(0, limit);
  }
}

