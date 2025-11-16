import React, { useState } from 'react';
import './CrateOpener.css';

interface CrateOpenerProps {
  userId: string | null;
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
  onBack: () => void;
}

interface CrateReward {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  probability: number;
}

const CRATE_REWARDS: CrateReward[] = [
  { id: 'common1', name: 'Réduction 5%', emoji: '🎁', rarity: 'common', probability: 40 },
  { id: 'common2', name: 'Réduction 10%', emoji: '🎁', rarity: 'common', probability: 30 },
  { id: 'rare1', name: 'Réduction 15%', emoji: '💎', rarity: 'rare', probability: 15 },
  { id: 'rare2', name: 'Réduction 20%', emoji: '💎', rarity: 'rare', probability: 10 },
  { id: 'epic1', name: 'Réduction 30%', emoji: '⭐', rarity: 'epic', probability: 3 },
  { id: 'epic2', name: 'Service Gratuit', emoji: '⭐', rarity: 'epic', probability: 1.5 },
  { id: 'legendary', name: 'JACKPOT - Service Premium Gratuit', emoji: '🏆', rarity: 'legendary', probability: 0.5 }
];

const CRATE_COST = 100;

const CrateOpener: React.FC<CrateOpenerProps> = ({ userId, balance, onBalanceUpdate, onBack }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [wonReward, setWonReward] = useState<CrateReward | null>(null);
  const [showResult, setShowResult] = useState(false);

  const selectRandomReward = (): CrateReward => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const reward of CRATE_REWARDS) {
      cumulative += reward.probability;
      if (random <= cumulative) {
        return reward;
      }
    }
    
    return CRATE_REWARDS[0];
  };

  const openCrate = async () => {
    if (balance < CRATE_COST || isOpening) return;

    setIsOpening(true);
    setShowResult(false);
    setWonReward(null);

    const selectedReward = selectRandomReward();

    setTimeout(async () => {
      try {
        // Récupérer le token OAuth pour vérification
        const accessToken = localStorage.getItem('discord_access_token');
        
        const response = await fetch('/api/currency/spend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id'),
            amount: CRATE_COST,
            reason: 'Ouverture de caisse',
            access_token: accessToken || undefined // Envoyer le token pour vérification
          })
        });

        if (response.ok) {
          const data = await response.json();
          onBalanceUpdate(data.newBalance);
          
          await fetch('/api/rewards/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId || localStorage.getItem('discord_user_id'),
              rewardId: selectedReward.id,
              rewardName: selectedReward.name,
              rewardType: 'crate'
            })
          });

          setWonReward(selectedReward);
          setShowResult(true);
        } else {
          alert('Erreur lors de l\'ouverture de la caisse');
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'ouverture de la caisse');
      } finally {
        setIsOpening(false);
      }
    }, 2000);
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return '#9ca3af';
      case 'rare': return '#3b82f6';
      case 'epic': return '#8b5cf6';
      case 'legendary': return '#fbbf24';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="crate-opener">
      <button className="back-button" onClick={onBack}>← Retour</button>
      
      <div className="crate-container">
        <h2>📦 Ouvrir une Caisse</h2>
        <p className="crate-cost">Coût: {CRATE_COST} €mynona Coins</p>
        <p className="balance-info">Solde actuel: {balance} coins</p>

        <div className={`crate-box ${isOpening ? 'opening' : ''}`}>
          {!showResult && (
            <div className="crate-content">
              <div className="crate-icon">📦</div>
              {!isOpening && (
                <button 
                  className={`open-button ${balance < CRATE_COST ? 'disabled' : ''}`}
                  onClick={openCrate}
                  disabled={balance < CRATE_COST || isOpening}
                >
                  {balance < CRATE_COST ? 'Solde insuffisant' : 'Ouvrir la Caisse'}
                </button>
              )}
              {isOpening && (
                <div className="opening-animation">
                  <div className="sparkle">✨</div>
                  <div className="sparkle">✨</div>
                  <div className="sparkle">✨</div>
                </div>
              )}
            </div>
          )}

          {showResult && wonReward && (
            <div className={`reward-result ${wonReward.rarity}`} style={{ borderColor: getRarityColor(wonReward.rarity) }}>
              <div className="reward-emoji">{wonReward.emoji}</div>
              <h3>{wonReward.name}</h3>
              <p className="rarity-badge" style={{ backgroundColor: getRarityColor(wonReward.rarity) }}>
                {wonReward.rarity.toUpperCase()}
              </p>
              <p className="reward-message">
                Votre récompense a été enregistrée ! Contactez le support sur Discord pour la récupérer.
              </p>
              <button className="close-button" onClick={() => { setShowResult(false); setWonReward(null); }}>
                Fermer
              </button>
            </div>
          )}
        </div>

        <div className="rewards-preview">
          <h3>Récompenses possibles:</h3>
          <div className="rewards-grid">
            {CRATE_REWARDS.map(reward => (
              <div 
                key={reward.id} 
                className="reward-preview-item"
                style={{ borderColor: getRarityColor(reward.rarity) }}
              >
                <span className="preview-emoji">{reward.emoji}</span>
                <span className="preview-name">{reward.name}</span>
                <span className="preview-rarity" style={{ color: getRarityColor(reward.rarity) }}>
                  {reward.rarity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrateOpener;

