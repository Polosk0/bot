import { DatabaseManager } from '../src/database/databaseManager';
import { CurrencyManager } from '../src/managers/currencyManager';

const USER_ID = '1081288703491719378';
const INFINITE_AMOUNT = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991

async function setInfiniteCoins() {
  try {
    const databaseManager = new DatabaseManager();
    
    let user = databaseManager.getUser(USER_ID);
    
    if (!user) {
      console.log(`Création de l'utilisateur ${USER_ID}...`);
      const userData = {
        id: USER_ID,
        username: 'Test User',
        discriminator: '0000',
        joinedAt: new Date(),
        lastActive: new Date(),
        warnings: 0,
        isBanned: false,
        emynonaCoins: 0,
        totalInvites: 0,
        rankFactor: 0
      };
      databaseManager.setUser(userData);
      user = databaseManager.getUser(USER_ID);
    }

    if (!user) {
      console.error('❌ Impossible de créer/récupérer l\'utilisateur');
      process.exit(1);
    }

    const oldBalance = user.emynonaCoins || 0;
    
    const success = CurrencyManager.setBalance(
      USER_ID,
      INFINITE_AMOUNT,
      'Défini pour les tests - Solde infini',
      {
        setBy: 'script',
        oldBalance
      }
    );

    if (success) {
      const newBalance = CurrencyManager.getBalance(USER_ID);
      console.log('✅ Solde défini avec succès !');
      console.log(`   Utilisateur: ${USER_ID}`);
      console.log(`   Ancien solde: ${oldBalance.toLocaleString()}`);
      console.log(`   Nouveau solde: ${newBalance.toLocaleString()}`);
      console.log(`   (${INFINITE_AMOUNT.toLocaleString()} coins)`);
    } else {
      console.error('❌ Erreur lors de la définition du solde');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

setInfiniteCoins();

