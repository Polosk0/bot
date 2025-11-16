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
  }, []);

  useEffect(() => {
    if (userId) {
      fetchBalance();
    } else {
      const storedId = localStorage.getItem('discord_user_id');
      if (storedId) {
        setUserId(storedId);
      } else {
        setLoading(false);
      }
    }
  }, [userId]);

  const fetchBalance = async () => {
    try {
      const id = userId || localStorage.getItem('discord_user_id');
      if (!id) {
        setLoading(false);
        return;
      }

      console.log('[BALANCE] Récupération du solde pour userId:', id);
      const response = await fetch(`/api/currency/balance?userId=${id}`);
      console.log('[BALANCE] Réponse:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[BALANCE] Données reçues:', data);
        setBalance(data.balance || 0);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[BALANCE] Erreur:', errorData);
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
        <h1>€mynona Coins</h1>
        <div className="balance-display">
          <span className="balance-label">Solde</span>
          <span className="balance-amount">{balance.toLocaleString()}</span>
        </div>
      </div>

      <div className="activity-menu">
        <div className="activity-card" onClick={() => setCurrentAction('crate')}>
          <div className="card-icon">📦</div>
          <h2>Caisse Premium</h2>
          <p>Ouvrez des caisses exclusives et découvrez des récompenses exceptionnelles</p>
          <div className="card-cost">100 coins</div>
        </div>

        <div className="activity-card" onClick={() => setCurrentAction('wheel')}>
          <div className="card-icon">🎡</div>
          <h2>Roue de la Fortune</h2>
          <p>Tentez votre chance et remportez des réductions sur vos prochaines commandes</p>
          <div className="card-cost">50 coins</div>
        </div>
      </div>

      <div className="activity-info">
        <h3>Comment gagner des coins ?</h3>
        <ul>
          <li>Invitez des membres sur le serveur et atteignez des paliers de récompenses</li>
          <li>Restez fidèle et bénéficiez de récompenses basées sur votre Rank Factor</li>
          <li>Participez aux événements spéciaux et aux promotions exclusives</li>
        </ul>
      </div>
    </div>
  );
};

export default ActivitySystem;

