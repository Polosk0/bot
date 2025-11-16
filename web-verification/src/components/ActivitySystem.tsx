import React, { useState, useEffect } from 'react';
import CrateOpener from './CrateOpener';
import DiscountWheel from './DiscountWheel';
import './ActivitySystem.css';

type ActivityAction = 'crate' | 'wheel' | 'home';

const ActivitySystem: React.FC = () => {
  const [currentAction, setCurrentAction] = useState<ActivityAction>('home');
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action') as ActivityAction;
    const id = urlParams.get('userId');
    
    if (id) {
      setUserId(id);
      localStorage.setItem('discord_user_id', id);
    } else {
      const storedId = localStorage.getItem('discord_user_id');
      if (storedId) {
        setUserId(storedId);
      }
    }

    if (action && (action === 'crate' || action === 'wheel')) {
      setCurrentAction(action);
    }

    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const id = userId || localStorage.getItem('discord_user_id');
      if (!id) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/currency/balance?userId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceUpdate = (newBalance: number) => {
    setBalance(newBalance);
  };

  if (loading) {
    return (
      <div className="activity-system">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (currentAction === 'crate') {
    return (
      <CrateOpener 
        userId={userId} 
        balance={balance} 
        onBalanceUpdate={handleBalanceUpdate}
        onBack={() => setCurrentAction('home')}
      />
    );
  }

  if (currentAction === 'wheel') {
    return (
      <DiscountWheel 
        userId={userId} 
        balance={balance} 
        onBalanceUpdate={handleBalanceUpdate}
        onBack={() => setCurrentAction('home')}
      />
    );
  }

  return (
    <div className="activity-system">
      <div className="activity-header">
        <h1>💰 Système €mynona Coins</h1>
        <div className="balance-display">
          <span className="balance-label">Votre solde:</span>
          <span className="balance-amount">{balance} €mynona Coins</span>
        </div>
      </div>

      <div className="activity-menu">
        <div className="activity-card" onClick={() => setCurrentAction('crate')}>
          <div className="card-icon">📦</div>
          <h2>Ouvrir une Caisse</h2>
          <p>Dépensez vos coins pour ouvrir des caisses et gagner des récompenses exclusives</p>
          <div className="card-cost">Coût: 100 coins</div>
        </div>

        <div className="activity-card" onClick={() => setCurrentAction('wheel')}>
          <div className="card-icon">🎡</div>
          <h2>Roue de Réductions</h2>
          <p>Tournez la roue pour gagner des réductions sur vos prochains achats</p>
          <div className="card-cost">Coût: 50 coins</div>
        </div>
      </div>

      <div className="activity-info">
        <h3>💡 Comment obtenir des €mynona Coins ?</h3>
        <ul>
          <li>👥 Invitez des membres sur le serveur (paliers de récompenses)</li>
          <li>💎 Soyez un client fidèle (récompenses basées sur votre Rank Factor)</li>
          <li>🎁 Participez aux événements spéciaux</li>
        </ul>
      </div>
    </div>
  );
};

export default ActivitySystem;

