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
    const token = urlParams.get('token'); // Token de session pour les activités Discord
    
    // Détecter si on est dans un iframe Discord
    const isDiscordIframe = window.self !== window.top;
    
    if (id) {
      // userId directement dans l'URL (lien direct)
      setUserId(id);
      localStorage.setItem('discord_user_id', id);
    } else if (token) {
      // Token de session (activité Discord lancée via /activity)
      console.log('[DISCORD] Token de session détecté:', token);
      getDiscordUserIdFromToken(token).then((discordUserId) => {
        if (discordUserId) {
          console.log('[DISCORD] userId récupéré depuis token:', discordUserId);
          setUserId(discordUserId);
          localStorage.setItem('discord_user_id', discordUserId);
        } else {
          const storedId = localStorage.getItem('discord_user_id');
          if (storedId) {
            setUserId(storedId);
          }
        }
      }).catch((error) => {
        console.error('[DISCORD] Erreur lors de la récupération du userId depuis token:', error);
        const storedId = localStorage.getItem('discord_user_id');
        if (storedId) {
          setUserId(storedId);
        }
      });
    } else if (isDiscordIframe) {
      // Si on est dans un iframe Discord sans token, essayer de récupérer le userId via l'API Discord
      getDiscordUserId().then((discordUserId) => {
        if (discordUserId) {
          console.log('[DISCORD] userId récupéré depuis Discord:', discordUserId);
          setUserId(discordUserId);
          localStorage.setItem('discord_user_id', discordUserId);
        } else {
          const storedId = localStorage.getItem('discord_user_id');
          if (storedId) {
            setUserId(storedId);
          }
        }
      }).catch((error) => {
        console.error('[DISCORD] Erreur lors de la récupération du userId:', error);
        const storedId = localStorage.getItem('discord_user_id');
        if (storedId) {
          setUserId(storedId);
        }
      });
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

  const getDiscordUserIdFromToken = async (token: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/discord/user-id?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.userId) {
          return data.userId;
        }
      }
      return null;
    } catch (error) {
      console.error('[DISCORD] Erreur API user-id:', error);
      return null;
    }
  };

  const getDiscordUserId = async (): Promise<string | null> => {
    return new Promise(async (resolve) => {
      // Méthode 1: Vérifier les query params Discord (Discord peut passer des infos via l'URL)
      const urlParams = new URLSearchParams(window.location.search);
      const discordUserId = urlParams.get('user_id') || urlParams.get('userId') || urlParams.get('discord_user_id');
      if (discordUserId) {
        console.log('[DISCORD] userId trouvé dans URL:', discordUserId);
        resolve(discordUserId);
        return;
      }

      // Méthode 2: Essayer de récupérer depuis l'API serveur (peut avoir des infos Discord)
      try {
        const response = await fetch('/api/discord/user-id');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.userId) {
            console.log('[DISCORD] userId récupéré depuis API:', data.userId);
            resolve(data.userId);
            return;
          }
        }
      } catch (error) {
        console.error('[DISCORD] Erreur API user-id:', error);
      }

      // Méthode 3: Utiliser Discord Activity SDK si disponible (MÉTHODE PRINCIPALE ET SÉCURISÉE)
      // Le SDK Discord est injecté automatiquement dans l'iframe par Discord
      if ((window as any).DiscordSdk) {
        try {
          console.log('[DISCORD SDK] SDK détecté, initialisation...');
          const discordSdk = (window as any).DiscordSdk;
          
          // Attendre que le SDK soit prêt
          await discordSdk.ready();
          console.log('[DISCORD SDK] SDK prêt');
          
          // FORCER l'authentification OAuth2 pour sécuriser l'accès
          const CLIENT_ID = process.env.REACT_APP_DISCORD_CLIENT_ID || '';
          if (!CLIENT_ID) {
            console.error('[DISCORD SDK] REACT_APP_DISCORD_CLIENT_ID non configuré');
            throw new Error('CLIENT_ID manquant');
          }
          
          console.log('[DISCORD SDK] Demande d\'autorisation OAuth2...');
          
          // Demander l'autorisation OAuth2 (obligatoire pour sécuriser)
          const { code } = await discordSdk.commands.authorize({
            client_id: CLIENT_ID,
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: ['identify'],
          });
          
          console.log('[DISCORD SDK] Code d\'autorisation obtenu');
          
          // Échanger le code contre un token (via votre serveur)
          const tokenResponse = await fetch('/api/discord/oauth-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));
            console.error('[DISCORD SDK] Erreur lors de l\'échange du code:', errorData);
            throw new Error('Impossible d\'obtenir le token');
          }
          
          const { access_token, user_id } = await tokenResponse.json();
          
          if (!access_token) {
            throw new Error('Token d\'accès non reçu');
          }
          
          console.log('[DISCORD SDK] Token obtenu, authentification...');
          
          // Authentifier avec le token
          await discordSdk.commands.authenticate({ access_token });
          
          // Récupérer l'utilisateur authentifié
          const user = await discordSdk.commands.getUser();
          
          if (user?.id) {
            // Vérifier que le userId correspond bien (sécurité supplémentaire)
            if (user_id && user.id !== user_id) {
              console.error('[DISCORD SDK] ⚠️ Incohérence de userId détectée!', { user_id, 'user.id': user.id });
            }
            
            console.log('[DISCORD SDK] ✅ Utilisateur authentifié et vérifié:', user);
            // Stocker le token pour les requêtes futures
            localStorage.setItem('discord_access_token', access_token);
            localStorage.setItem('discord_user_id_verified', user.id);
            resolve(user.id);
            return;
          } else {
            throw new Error('Impossible de récupérer l\'utilisateur après authentification');
          }
        } catch (error: any) {
          console.error('[DISCORD SDK] Erreur lors de l\'authentification:', error);
          console.error('[DISCORD SDK] Message:', error?.message);
          console.error('[DISCORD SDK] Stack:', error?.stack);
          // Ne pas résoudre avec null ici, laisser les autres méthodes essayer
        }
      } else {
        console.log('[DISCORD SDK] SDK non disponible (pas dans un iframe Discord ou SDK non chargé)');
      }

      // Méthode 4: Utiliser postMessage pour communiquer avec le parent Discord
      const messageHandler = (event: MessageEvent) => {
        // Accepter les messages de Discord
        if (event.origin.includes('discord.com') || event.origin.includes('discordapp.com')) {
          if (event.data && typeof event.data === 'object') {
            // Discord peut envoyer des données utilisateur
            if (event.data.user_id || event.data.userId || event.data.user?.id) {
              const userId = event.data.user_id || event.data.userId || event.data.user?.id;
              console.log('[DISCORD] userId reçu via postMessage:', userId);
              window.removeEventListener('message', messageHandler);
              resolve(userId);
              return;
            }
            
            if (event.data.type === 'DISCORD_USER_ID') {
              console.log('[DISCORD] userId reçu via postMessage:', event.data.userId);
              window.removeEventListener('message', messageHandler);
              resolve(event.data.userId);
              return;
            }
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Demander le userId au parent Discord
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({ type: 'GET_DISCORD_USER_ID' }, '*');
          window.parent.postMessage({ type: 'REQUEST_USER_ID' }, '*');
        } catch (error) {
          console.error('[DISCORD] Erreur postMessage:', error);
        }
      }

      // Timeout après 3 secondes
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        console.warn('[DISCORD] Timeout - userId non récupéré depuis Discord, utilisation du localStorage');
        resolve(null);
      }, 3000);
    });
  };

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

