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
    const code = urlParams.get('code'); // Code OAuth2 retourné par Discord
    const state = urlParams.get('state'); // State OAuth2 (peut contenir le userId attendu)
    
    // Détecter si on est dans un iframe Discord
    const isDiscordIframe = window.self !== window.top;
    
    // Gérer le callback OAuth2
    if (code) {
      handleOAuth2Callback(code, state || undefined).then((authenticatedUserId) => {
        if (authenticatedUserId) {
          setUserId(authenticatedUserId);
          localStorage.setItem('discord_user_id', authenticatedUserId);
          // Nettoyer l'URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          console.error('[OAUTH2] ❌ Authentification échouée');
          setLoading(false);
        }
      });
      return;
    }
    
    // SÉCURITÉ : Si userId dans l'URL mais pas dans un iframe Discord, forcer l'authentification OAuth2
    if (id && !isDiscordIframe) {
      console.warn('[SECURITY] ⚠️ userId dans l\'URL mais pas dans un iframe Discord - Authentification OAuth2 requise');
      // Vérifier si on a déjà un token valide
      const storedToken = localStorage.getItem('discord_access_token');
      const verifiedUserId = localStorage.getItem('discord_user_id_verified');
      
      if (storedToken && verifiedUserId === id) {
        // Token valide et userId correspond
        console.log('[SECURITY] ✅ Token OAuth2 valide pour userId:', id);
        setUserId(id);
      } else {
        // Forcer l'authentification OAuth2
        console.log('[SECURITY] 🔐 Authentification OAuth2 requise...');
        authenticateWithOAuth2(id).then((authenticatedUserId) => {
          if (authenticatedUserId) {
            setUserId(authenticatedUserId);
            localStorage.setItem('discord_user_id', authenticatedUserId);
          } else {
            // La redirection va se faire, on ne fait rien ici
          }
        }).catch((error) => {
          console.error('[SECURITY] ❌ Erreur d\'authentification:', error);
          setLoading(false);
        });
        return; // Ne pas continuer avant l'authentification
      }
    } else if (id && isDiscordIframe) {
      // Dans un iframe Discord, on utilisera le SDK (plus sécurisé)
      // Mais on peut quand même stocker temporairement
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
      // Si on est dans un iframe Discord, essayer de récupérer le userId via le SDK Discord
      console.log('[DISCORD] Détection iframe Discord, récupération du userId...');
      getDiscordUserId().then((discordUserId) => {
        if (discordUserId) {
          console.log('[DISCORD] ✅ userId récupéré depuis Discord:', discordUserId);
          setUserId(discordUserId);
          // Forcer immédiatement la récupération du solde
          setTimeout(() => {
            fetchBalanceWithId(discordUserId).catch(err => {
              console.error('[DISCORD] Erreur lors de fetchBalanceWithId:', err);
            });
          }, 100);
        } else {
          console.warn('[DISCORD] ⚠️ userId non récupéré, vérification du localStorage...');
          const storedId = localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id');
          if (storedId) {
            console.log('[DISCORD] Utilisation du userId stocké:', storedId);
            setUserId(storedId);
            // Forcer immédiatement la récupération du solde
            setTimeout(() => {
              fetchBalanceWithId(storedId).catch(err => {
                console.error('[DISCORD] Erreur lors de fetchBalanceWithId:', err);
              });
            }, 100);
          } else {
            console.error('[DISCORD] ❌ Aucun userId disponible');
            // Attendre encore un peu au cas où le SDK Discord met du temps
            setTimeout(() => {
              const retryId = localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id');
              if (retryId) {
                console.log('[DISCORD] Retry: userId trouvé:', retryId);
                setUserId(retryId);
                fetchBalanceWithId(retryId);
              } else {
                setLoading(false);
              }
            }, 3000);
          }
        }
      }).catch((error) => {
        console.error('[DISCORD] ❌ Erreur lors de la récupération du userId:', error);
        const storedId = localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id');
        if (storedId) {
          console.log('[DISCORD] Utilisation du userId stocké après erreur:', storedId);
          setUserId(storedId);
          fetchBalanceWithId(storedId);
        } else {
          setLoading(false);
        }
      });
    } else {
      // Pas dans un iframe Discord, utiliser le localStorage
      const storedId = localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id');
      if (storedId) {
        setUserId(storedId);
      } else {
        setLoading(false);
      }
    }

    if (action && (action === 'crate' || action === 'wheel')) {
      setCurrentAction(action);
    }
  }, []);

  // Fonction pour récupérer le solde avec un userId spécifique
  const fetchBalanceWithId = async (id: string) => {
    try {
      console.log('[BALANCE] Début de la récupération du solde pour userId:', id);
      
      // Récupérer le token OAuth pour vérification
      const accessToken = localStorage.getItem('discord_access_token');
      
      const url = accessToken 
        ? `/api/currency/balance?userId=${id}&access_token=${encodeURIComponent(accessToken)}`
        : `/api/currency/balance?userId=${id}`;
      
      console.log('[BALANCE] URL de la requête:', url);
      const response = await fetch(url);
      console.log('[BALANCE] Réponse reçue:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[BALANCE] ✅ Données reçues:', data);
        const balanceValue = data.balance || 0;
        console.log('[BALANCE] ✅ Solde défini à:', balanceValue);
        setBalance(balanceValue);
        setLoading(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[BALANCE] ❌ Erreur HTTP:', response.status, errorData);
        
        // Si erreur 403, c'est une tentative de fraude détectée
        if (response.status === 403) {
          alert('⚠️ Erreur de sécurité : Le userId ne correspond pas à votre compte authentifié.');
          // Nettoyer et forcer la ré-authentification
          localStorage.removeItem('discord_access_token');
          localStorage.removeItem('discord_user_id_verified');
          localStorage.removeItem('discord_user_id');
          window.location.reload();
        } else if (response.status === 400) {
          console.error('[BALANCE] ❌ userId manquant ou invalide dans la requête');
        } else {
          console.error('[BALANCE] ❌ Erreur serveur:', response.status);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('[BALANCE] ❌ Erreur lors de la récupération du solde:', error);
      setLoading(false);
    }
  };

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

  const authenticateWithOAuth2 = async (expectedUserId?: string): Promise<string | null> => {
    try {
      const CLIENT_ID = process.env.REACT_APP_DISCORD_CLIENT_ID || '';
      if (!CLIENT_ID) {
        console.error('[OAUTH2] CLIENT_ID non configuré');
        return null;
      }

      // Vérifier si on a déjà un token valide
      const storedToken = localStorage.getItem('discord_access_token');
      if (storedToken) {
        const verifyResponse = await fetch('/api/discord/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: storedToken })
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            // Vérifier que le userId correspond si attendu
            if (expectedUserId && verifyData.userId !== expectedUserId) {
              console.error('[OAUTH2] ⚠️ Le userId ne correspond pas au token');
              // Token invalide pour cet utilisateur, le supprimer
              localStorage.removeItem('discord_access_token');
              localStorage.removeItem('discord_user_id_verified');
            } else {
              console.log('[OAUTH2] ✅ Token valide pour userId:', verifyData.userId);
              localStorage.setItem('discord_user_id_verified', verifyData.userId);
              return verifyData.userId;
            }
          }
        }
      }

      // Rediriger vers OAuth2 Discord
      const redirectUri = `${window.location.origin}/activity`;
      const scope = 'identify';
      const state = expectedUserId || '';
      const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
      
      console.log('[OAUTH2] Redirection vers Discord OAuth2...');
      window.location.href = authUrl;
      return null; // La redirection va se faire
    } catch (error) {
      console.error('[OAUTH2] Erreur:', error);
      return null;
    }
  };

  const handleOAuth2Callback = async (code: string, state?: string): Promise<string | null> => {
    try {
      console.log('[OAUTH2] Traitement du callback OAuth2...');
      
      // Échanger le code contre un token
      const tokenResponse = await fetch('/api/discord/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        console.error('[OAUTH2] Erreur lors de l\'échange du code:', errorData);
        return null;
      }

      const { access_token, user_id } = await tokenResponse.json();

      if (!access_token || !user_id) {
        console.error('[OAUTH2] Token ou userId manquant');
        return null;
      }

      // Vérifier que le userId correspond à celui attendu (si fourni dans state)
      if (state && state !== user_id) {
        console.error('[OAUTH2] ⚠️ Le userId ne correspond pas à celui attendu', {
          expected: state,
          received: user_id
        });
        // On accepte quand même car l'utilisateur s'est authentifié
        // Mais on log l'alerte
      }

      // Stocker le token
      localStorage.setItem('discord_access_token', access_token);
      localStorage.setItem('discord_user_id_verified', user_id);
      
      console.log('[OAUTH2] ✅ Authentification réussie pour userId:', user_id);
      return user_id;
    } catch (error) {
      console.error('[OAUTH2] Erreur lors du callback:', error);
      return null;
    }
  };

  const getDiscordUserId = async (): Promise<string | null> => {
    return new Promise(async (resolve) => {
      console.log('[DISCORD] Début de la récupération du userId...');
      
      // Méthode 1: Utiliser Discord Activity SDK si disponible (MÉTHODE PRINCIPALE POUR IFRAME)
      // Le SDK Discord est injecté automatiquement dans l'iframe par Discord
      if ((window as any).DiscordSdk) {
        try {
          console.log('[DISCORD SDK] SDK détecté, initialisation...');
          const discordSdk = (window as any).DiscordSdk;
          
          // Attendre que le SDK soit prêt
          await discordSdk.ready();
          console.log('[DISCORD SDK] SDK prêt');
          
          // Essayer d'abord de récupérer l'utilisateur SANS OAuth2 (plus simple et plus rapide)
          try {
            console.log('[DISCORD SDK] Tentative de récupération directe de l\'utilisateur...');
            const user = await discordSdk.commands.getUser();
            
            if (user?.id) {
              console.log('[DISCORD SDK] ✅ Utilisateur récupéré directement:', user.id);
              localStorage.setItem('discord_user_id', user.id);
              resolve(user.id);
              return;
            }
          } catch (getUserError: any) {
            console.log('[DISCORD SDK] getUser() direct a échoué, tentative avec OAuth2...', getUserError?.message);
            
            // Si getUser() échoue, essayer avec OAuth2
            const CLIENT_ID = process.env.REACT_APP_DISCORD_CLIENT_ID || '';
            if (CLIENT_ID) {
              try {
                console.log('[DISCORD SDK] Demande d\'autorisation OAuth2...');
                
                // Demander l'autorisation OAuth2
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
                
                if (!access_token || !user_id) {
                  throw new Error('Token ou userId manquant');
                }
                
                console.log('[DISCORD SDK] Token obtenu, authentification...');
                
                // Authentifier avec le token
                await discordSdk.commands.authenticate({ access_token });
                
                // Récupérer l'utilisateur authentifié
                const user = await discordSdk.commands.getUser();
                
                if (user?.id) {
                  console.log('[DISCORD SDK] ✅ Utilisateur authentifié:', user.id);
                  localStorage.setItem('discord_access_token', access_token);
                  localStorage.setItem('discord_user_id_verified', user.id);
                  localStorage.setItem('discord_user_id', user.id);
                  resolve(user.id);
                  return;
                } else {
                  throw new Error('Impossible de récupérer l\'utilisateur après authentification');
                }
              } catch (oauthError: any) {
                console.error('[DISCORD SDK] Erreur OAuth2:', oauthError?.message);
                // Continuer avec les autres méthodes
              }
            }
          }
        } catch (error: any) {
          console.error('[DISCORD SDK] Erreur générale:', error?.message);
          // Continuer avec les autres méthodes
        }
      } else {
        console.log('[DISCORD SDK] SDK non disponible');
      }

      // Méthode 2: Vérifier les query params (userId ou token de session)
      const urlParams = new URLSearchParams(window.location.search);
      const discordUserId = urlParams.get('user_id') || urlParams.get('userId') || urlParams.get('discord_user_id');
      if (discordUserId) {
        console.log('[DISCORD] userId trouvé dans URL:', discordUserId);
        localStorage.setItem('discord_user_id', discordUserId);
        resolve(discordUserId);
        return;
      }

      // Méthode 3: Récupérer depuis le token de session (activité Discord lancée via /activity)
      const token = urlParams.get('token');
      if (token) {
        try {
          const response = await fetch(`/api/discord/user-id?token=${token}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.userId) {
              console.log('[DISCORD] userId récupéré depuis token de session:', data.userId);
              localStorage.setItem('discord_user_id', data.userId);
              resolve(data.userId);
              return;
            }
          }
        } catch (error) {
          console.error('[DISCORD] Erreur API user-id avec token:', error);
        }
      }

      // Méthode 4: Essayer de récupérer depuis l'API serveur (sans token)
      try {
        const response = await fetch('/api/discord/user-id');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.userId) {
            console.log('[DISCORD] userId récupéré depuis API:', data.userId);
            localStorage.setItem('discord_user_id', data.userId);
            resolve(data.userId);
            return;
          }
        }
      } catch (error) {
        console.error('[DISCORD] Erreur API user-id:', error);
      }

      // Méthode 5: Utiliser postMessage pour communiquer avec le parent Discord
      const messageHandler = (event: MessageEvent) => {
        // Accepter les messages de Discord
        if (event.origin.includes('discord.com') || event.origin.includes('discordapp.com')) {
          if (event.data && typeof event.data === 'object') {
            // Discord peut envoyer des données utilisateur
            if (event.data.user_id || event.data.userId || event.data.user?.id) {
              const userId = event.data.user_id || event.data.userId || event.data.user?.id;
              console.log('[DISCORD] userId reçu via postMessage:', userId);
              window.removeEventListener('message', messageHandler);
              localStorage.setItem('discord_user_id', userId);
              resolve(userId);
              return;
            }
            
            if (event.data.type === 'DISCORD_USER_ID') {
              console.log('[DISCORD] userId reçu via postMessage:', event.data.userId);
              window.removeEventListener('message', messageHandler);
              localStorage.setItem('discord_user_id', event.data.userId);
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

      // Timeout après 5 secondes (augmenté pour laisser plus de temps au SDK)
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        const storedId = localStorage.getItem('discord_user_id');
        if (storedId) {
          console.log('[DISCORD] Utilisation du userId stocké:', storedId);
          resolve(storedId);
        } else {
          console.warn('[DISCORD] Timeout - userId non récupéré depuis Discord');
          resolve(null);
        }
      }, 5000);
    });
  };

  useEffect(() => {
    // Essayer de récupérer le userId et le solde
    const attemptFetchBalance = async () => {
      const id = userId || localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id');
      
      if (id) {
        console.log('[BALANCE] userId disponible, récupération du solde...', id);
        // Si userId n'est pas encore défini dans le state, le définir
        if (!userId && id) {
          setUserId(id);
        }
        // Appeler fetchBalance avec l'id
        await fetchBalanceWithId(id);
      } else {
        console.warn('[BALANCE] ⚠️ Aucun userId disponible, attente...');
        // Attendre un peu et réessayer (pour le cas où le SDK Discord met du temps)
        setTimeout(() => {
          const retryId = localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id');
          if (retryId) {
            console.log('[BALANCE] Retry: userId trouvé après attente:', retryId);
            setUserId(retryId);
            fetchBalanceWithId(retryId);
          } else {
            console.error('[BALANCE] ❌ Aucun userId disponible après attente');
            setLoading(false);
          }
        }, 2000);
      }
    };

    attemptFetchBalance();
  }, [userId]);

  const fetchBalance = async () => {
    const id = userId || localStorage.getItem('discord_user_id_verified') || localStorage.getItem('discord_user_id');
    if (!id) {
      console.warn('[BALANCE] ⚠️ Aucun userId disponible pour fetchBalance');
      setLoading(false);
      return;
    }
    await fetchBalanceWithId(id);
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


