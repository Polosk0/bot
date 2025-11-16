import React, { useEffect } from 'react';
import ActivitySystem from '../components/ActivitySystem';
import './GamePage.css';

const GamePage: React.FC = () => {
  useEffect(() => {
    if (window.self !== window.top) {
      document.body.classList.add('discord-iframe');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      if (header) header.style.display = 'none';
      if (footer) footer.style.display = 'none';
    }
  }, []);

  return (
    <div className="game-page">
      <ActivitySystem />
    </div>
  );
};

export default GamePage;

