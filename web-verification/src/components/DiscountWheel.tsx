import React, { useState } from 'react';
import './DiscountWheel.css';

interface DiscountWheelProps {
  userId: string | null;
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
  onBack: () => void;
}

interface DiscountReward {
  id: string;
  name: string;
  emoji: string;
  discount: number;
  probability: number;
  color: string;
}

const DISCOUNT_REWARDS: DiscountReward[] = [
  { id: 'nothing', name: 'Rien cette fois', emoji: '😔', discount: 0, probability: 30, color: '#6B7280' },
  { id: '5percent', name: 'Réduction 5%', emoji: '🎁', discount: 5, probability: 25, color: '#10B981' },
  { id: '10percent', name: 'Réduction 10%', emoji: '🎉', discount: 10, probability: 20, color: '#3B82F6' },
  { id: '15percent', name: 'Réduction 15%', emoji: '💎', discount: 15, probability: 12, color: '#8B5CF6' },
  { id: '20percent', name: 'Réduction 20%', emoji: '⭐', discount: 20, probability: 8, color: '#EC4899' },
  { id: '30percent', name: 'Réduction 30%', emoji: '🏆', discount: 30, probability: 4, color: '#FCD34D' },
  { id: '50percent', name: 'Réduction 50%', emoji: '👑', discount: 50, probability: 0.8, color: '#F59E0B' },
  { id: 'free', name: 'Service Gratuit', emoji: '🎊', discount: 100, probability: 0.2, color: '#EF4444' }
];

const WHEEL_COST = 50;

const DiscountWheel: React.FC<DiscountWheelProps> = ({ userId, balance, onBalanceUpdate, onBack }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<DiscountReward | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const selectRandomReward = (): DiscountReward => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const reward of DISCOUNT_REWARDS) {
      cumulative += reward.probability;
      if (random <= cumulative) {
        return reward;
      }
    }
    
    return DISCOUNT_REWARDS[0];
  };

  const spinWheel = async () => {
    if (!canSpin || isSpinning || balance < WHEEL_COST) return;
    
    setIsSpinning(true);
    setCanSpin(false);
    setShowResult(false);
    setWonReward(null);
    
    const selectedReward = selectRandomReward();
    const rewardIndex = DISCOUNT_REWARDS.findIndex(r => r.id === selectedReward.id);
    const segmentAngle = 360 / DISCOUNT_REWARDS.length;
    const targetAngle = rewardIndex * segmentAngle;
    
    const spins = 5;
    const totalRotation = rotation + spins * 360 + (360 - targetAngle);
    
    setRotation(totalRotation);

    setTimeout(async () => {
      try {
        const response = await fetch('/api/currency/spend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || localStorage.getItem('discord_user_id'),
            amount: WHEEL_COST,
            reason: 'Tour de roue de réductions'
          })
        });

        if (response.ok) {
          const data = await response.json();
          onBalanceUpdate(data.newBalance);
          
          if (selectedReward.id !== 'nothing') {
            await fetch('/api/rewards/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId || localStorage.getItem('discord_user_id'),
                rewardId: selectedReward.id,
                rewardName: selectedReward.name,
                rewardType: 'wheel',
                discount: selectedReward.discount
              })
            });
          }

          setWonReward(selectedReward);
          setShowResult(true);
        } else {
          alert('Erreur lors du tour de roue');
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du tour de roue');
      } finally {
        setIsSpinning(false);
      }
    }, 4000);
  };

  const resetWheel = () => {
    setCanSpin(true);
    setShowResult(false);
    setWonReward(null);
  };

  const getRewardMessage = (reward: DiscountReward): string => {
    if (reward.id === 'nothing') {
      return 'Dommage ! Réessayez plus tard pour tenter votre chance !';
    }
    if (reward.discount === 100) {
      return 'Incroyable ! Vous avez gagné un service gratuit ! Contactez le support pour le récupérer.';
    }
    return `Félicitations ! Vous avez gagné une réduction de ${reward.discount}% sur votre prochaine commande !`;
  };

  return (
    <div className="discount-wheel-container">
      <button className="back-button" onClick={onBack}>← Retour</button>
      
      <div className="wheel-header">
        <h2>🎡 Roue de Réductions</h2>
        <p className="wheel-cost">Coût: {WHEEL_COST} €mynona Coins</p>
        <p className="balance-info">Solde actuel: {balance} coins</p>
      </div>

      <div className="wheel-wrapper">
        <div 
          className={`wheel ${isSpinning ? 'spinning' : ''}`}
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
          }}
        >
          {DISCOUNT_REWARDS.map((reward, index) => {
            const angle = (360 / DISCOUNT_REWARDS.length) * index;
            return (
              <div
                key={reward.id}
                className="wheel-segment"
                style={{
                  transform: `rotate(${angle}deg)`,
                  backgroundColor: reward.color,
                  '--segment-angle': `${360 / DISCOUNT_REWARDS.length}deg`
                } as React.CSSProperties}
              >
                <div className="segment-content">
                  <span className="segment-emoji">{reward.emoji}</span>
                  <span className="segment-name">{reward.name}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="wheel-pointer"></div>
      </div>

      {!showResult && (
        <button 
          className={`spin-button ${!canSpin || isSpinning || balance < WHEEL_COST ? 'disabled' : ''}`}
          onClick={spinWheel}
          disabled={!canSpin || isSpinning || balance < WHEEL_COST}
        >
          {isSpinning ? '🎰 En cours...' : balance < WHEEL_COST ? 'Solde insuffisant' : canSpin ? '🎲 Tourner la roue' : '⏰ Réessayez plus tard'}
        </button>
      )}

      {showResult && wonReward && (
        <div className={`reward-result ${wonReward.id === 'nothing' ? 'nothing' : 'won'}`}>
          <div className="reward-icon">{wonReward.emoji}</div>
          <h3>{wonReward.name}</h3>
          <p>{getRewardMessage(wonReward)}</p>
          {wonReward.id !== 'nothing' && (
            <div className="reward-actions">
              <p className="reward-info">💡 Votre récompense a été enregistrée ! Contactez le support sur Discord pour la récupérer.</p>
            </div>
          )}
          <button className="reset-button" onClick={resetWheel}>
            {wonReward.id === 'nothing' ? 'Réessayer' : 'Fermer'}
          </button>
        </div>
      )}

      <div className="wheel-info">
        <p className="info-text">Les récompenses sont attribuées aléatoirement selon les probabilités</p>
        <div className="rewards-list">
          <p className="rewards-title">Récompenses disponibles :</p>
          <div className="rewards-grid">
            {DISCOUNT_REWARDS.filter(r => r.id !== 'nothing').map(reward => (
              <div key={reward.id} className="reward-item" style={{ borderColor: reward.color }}>
                <span className="reward-item-emoji">{reward.emoji}</span>
                <span className="reward-item-name">{reward.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountWheel;

