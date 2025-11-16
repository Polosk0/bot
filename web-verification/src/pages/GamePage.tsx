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
      
      // Écouter les messages de Discord et essayer d'extraire le userId
      const messageHandler = (event: MessageEvent) => {
        const isDiscordOrigin = event.origin.includes('discord.com') || 
                                event.origin.includes('discordapp.com') ||
                                event.origin.includes('discordsays.com');
        
        if (isDiscordOrigin) {
          console.log('[DISCORD IFRAME] Message reçu:', event.origin, event.data);
          
          // Essayer d'extraire le userId des messages Discord
          if (event.data && typeof event.data === 'object') {
            let userId = event.data.user_id || event.data.userId || event.data.user?.id || event.data.member?.user?.id;
            if (userId) {
              console.log('[DISCORD IFRAME] ✅ userId extrait du message:', userId);
              localStorage.setItem('discord_user_id', userId);
              // Déclencher un événement personnalisé pour notifier ActivitySystem
              window.dispatchEvent(new CustomEvent('discordUserIdReceived', { detail: { userId } }));
            }
          }
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

