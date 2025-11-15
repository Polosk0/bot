import React, { useEffect } from 'react';
import LuckyWheel from '../components/LuckyWheel';
import './GamePage.css';

const GamePage: React.FC = () => {
  useEffect(() => {
    // Détecter si on est dans un iframe Discord
    if (window.self !== window.top) {
      document.body.classList.add('discord-iframe');
      // Supprimer le Header et Footer si présents
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      if (header) header.style.display = 'none';
      if (footer) footer.style.display = 'none';
    }
  }, []);

  return (
    <div className="game-page">
      <div className="game-page-background">
        <div className="game-particles"></div>
        <div className="game-grid"></div>
      </div>
      <div className="game-page-container">
        <div className="game-page-header">
          <h1 className="game-page-title">
            <span className="game-title-icon">🎰</span>
            Roue de la Fortune
            <span className="game-title-icon">🎰</span>
          </h1>
          <p className="game-page-subtitle">
            Tentez votre chance et gagnez des récompenses exclusives !
          </p>
        </div>
        <LuckyWheel />
      </div>
    </div>
  );
};

export default GamePage;

