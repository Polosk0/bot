import React, { useState, useEffect } from 'react';
import './LuckyWheel.css';

interface Reward {
  id: string;
  name: string;
  emoji: string;
  probability: number;
  color: string;
}

const REWARDS: Reward[] = [
  { id: 'nothing', name: 'Rien cette fois', emoji: '😔', probability: 40, color: '#6B7280' },
  { id: '5percent', name: 'Promotion 5%', emoji: '🎁', probability: 25, color: '#10B981' },
  { id: '10percent', name: 'Promotion 10%', emoji: '🎉', probability: 15, color: '#3B82F6' },
  { id: 'uber', name: 'Compte Uber Eats', emoji: '🍔', probability: 10, color: '#F59E0B' },
  { id: '20percent', name: 'Promotion 20%', emoji: '💎', probability: 5, color: '#8B5CF6' },
  { id: 'free', name: 'Service Gratuit', emoji: '⭐', probability: 3, color: '#EC4899' },
  { id: 'jackpot', name: 'JACKPOT !', emoji: '🏆', probability: 2, color: '#FCD34D' }
];

const LuckyWheel: React.FC = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<Reward | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const [spinCount, setSpinCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const maxSpins = 1;

  const selectRandomReward = (): Reward => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const reward of REWARDS) {
      cumulative += reward.probability;
      if (random <= cumulative) {
        return reward;
      }
    }
    
    return REWARDS[0];
  };

  const spinWheel = () => {
    if (!canSpin || isSpinning) return;
    
    setIsSpinning(true);
    setCanSpin(false);
    setShowResult(false);
    setWonReward(null);
    
    const selectedReward = selectRandomReward();
    const rewardIndex = REWARDS.findIndex(r => r.id === selectedReward.id);
    const segmentAngle = 360 / REWARDS.length;
    const targetAngle = rewardIndex * segmentAngle;
    
    const spins = 5;
    const totalRotation = rotation + spins * 360 + (360 - targetAngle);
    
    setRotation(totalRotation);
    
    setTimeout(() => {
      setIsSpinning(false);
      setWonReward(selectedReward);
      setShowResult(true);
      setSpinCount(prev => prev + 1);
      
      if (selectedReward.id !== 'nothing') {
        saveReward(selectedReward);
      }
    }, 4000);
  };

  const saveReward = async (reward: Reward) => {
    try {
      // Essayer de récupérer l'userId depuis différentes sources
      let userId = localStorage.getItem('discord_user_id');
      
      // Si pas dans localStorage, essayer depuis l'URL ou les cookies
      if (!userId) {
        const urlParams = new URLSearchParams(window.location.search);
        userId = urlParams.get('userId') || null;
      }
      
      if (!userId) {
        console.warn('[REWARDS] userId non trouvé, récompense non sauvegardée');
        return;
      }
      
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          rewardId: reward.id,
          rewardName: reward.name
        })
      });
      
      if (response.ok) {
        console.log('[REWARDS] Récompense sauvegardée avec succès');
      } else {
        console.error('[REWARDS] Erreur lors de la sauvegarde:', await response.text());
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la récompense:', error);
    }
  };

  const resetWheel = () => {
    if (spinCount >= maxSpins) {
      setCanSpin(false);
    } else {
      setCanSpin(true);
    }
    setShowResult(false);
    setWonReward(null);
  };

  const getRewardMessage = (reward: Reward): string => {
    const messages: { [key: string]: string } = {
      nothing: 'Dommage ! Réessayez plus tard pour tenter votre chance !',
      '5percent': 'Félicitations ! Vous avez gagné une promotion de 5% sur votre prochaine commande !',
      '10percent': 'Excellent ! Vous avez gagné une promotion de 10% sur votre prochaine commande !',
      uber: 'Incroyable ! Vous avez gagné un compte Uber Eats ! Contactez le support pour le récupérer.',
      '20percent': 'Fantastique ! Vous avez gagné une promotion de 20% sur votre prochaine commande !',
      free: 'Extraordinaire ! Vous avez gagné un service gratuit ! Contactez le support.',
      jackpot: '🎊 JACKPOT ! Vous avez gagné le grand prix ! Contactez immédiatement le support !'
    };
    return messages[reward.id] || 'Félicitations !';
  };

  return (
    <div className="lucky-wheel-container">
      <div className="lucky-wheel-header">
        <h2>🎰 Roue de la Fortune Emynona</h2>
        <p>Tentez votre chance pour gagner des récompenses exclusives !</p>
      </div>

      <div className="wheel-wrapper">
        <div 
          className={`wheel ${isSpinning ? 'spinning' : ''}`}
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
          }}
        >
          {REWARDS.map((reward, index) => {
            const angle = (360 / REWARDS.length) * index;
            return (
              <div
                key={reward.id}
                className="wheel-segment"
                style={{
                  transform: `rotate(${angle}deg)`,
                  backgroundColor: reward.color,
                  '--segment-angle': `${360 / REWARDS.length}deg`
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
          className={`spin-button ${!canSpin || isSpinning ? 'disabled' : ''}`}
          onClick={spinWheel}
          disabled={!canSpin || isSpinning}
        >
          {isSpinning ? '🎰 En cours...' : canSpin ? '🎲 Tourner la roue' : '⏰ Réessayez plus tard'}
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
        <p>🎯 Vous avez {Math.max(0, maxSpins - spinCount)} tour{Math.max(0, maxSpins - spinCount) > 1 ? 's' : ''} restant{Math.max(0, maxSpins - spinCount) > 1 ? 's' : ''}</p>
        <p className="info-text">Les récompenses sont attribuées aléatoirement selon les probabilités</p>
        <div className="rewards-list">
          <p className="rewards-title">Récompenses disponibles :</p>
          <div className="rewards-grid">
            {REWARDS.filter(r => r.id !== 'nothing').map(reward => (
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

export default LuckyWheel;

