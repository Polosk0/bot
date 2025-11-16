import React, { useEffect } from 'react';
import ActivitySystem from '../components/ActivitySystem';
import './GamePage.css';

const GamePage: React.FC = () => {
  useEffect(() => {
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      document.body.classList.add('discord-iframe');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      if (header) header.style.display = 'none';
      if (footer) footer.style.display = 'none';

      // Logger pour debug
      console.log('[DISCORD IFRAME] Détecté dans iframe Discord');
      console.log('[DISCORD IFRAME] URL:', window.location.href);
      console.log('[DISCORD IFRAME] Query params:', window.location.search);
      
      // Écouter les messages de Discord
      const messageHandler = (event: MessageEvent) => {
        if (event.origin.includes('discord.com') || event.origin.includes('discordapp.com')) {
          console.log('[DISCORD IFRAME] Message reçu:', event.data);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      return () => {
        window.removeEventListener('message', messageHandler);
      };
    }
  }, []);

  return (
    <div className="game-page">
      <ActivitySystem />
    </div>
  );
};

export default GamePage;

