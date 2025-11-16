require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const nacl = require('tweetnacl');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Discord
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://emynona.shop/auth/callback';
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const GUILD_ID = process.env.GUILD_ID;

// Configuration Bot API
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';
const BOT_API_KEY = process.env.BOT_API_KEY;

if (!BOT_API_KEY) {
  console.warn('⚠️  BOT_API_KEY non définie dans le .env ! La vérification ne fonctionnera pas.');
}

// Middleware pour les interactions Discord (doit être avant express.json)
app.use('/api/interactions', express.raw({ type: 'application/json' }));

// Middleware
app.use(express.json());

// Headers pour compatibilité Discord Activities (iframe) - DOIT être avant static
app.use((req, res, next) => {
    // Supprimer X-Frame-Options si présent (obsolète mais certains serveurs l'ajoutent)
    res.removeHeader('X-Frame-Options');
    
    // Configurer CSP pour autoriser Discord iframe (MÉTHODE MODERNE ET RECOMMANDÉE)
    // Note: frame-ancestors remplace X-Frame-Options dans les navigateurs modernes
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://discord.com https://*.discord.com https://discordapp.com https://*.discordapp.com;");
    
    // Headers CORS pour Discord
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature-Ed25519, X-Signature-Timestamp, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Headers supplémentaires pour Discord
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Gérer les requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Servir les fichiers statiques depuis le dossier build (application React compilée)
app.use(express.static(path.join(__dirname, 'build'), {
    setHeaders: (res, path) => {
        // S'assurer que les fichiers statiques ont aussi les bons headers
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://discord.com https://*.discord.com https://discordapp.com https://*.discordapp.com");
    }
}));

// Fonction pour vérifier la signature Discord
function verifyDiscordSignature(signature, timestamp, body, publicKey) {
    if (!publicKey) {
        console.warn('[INTERACTIONS] DISCORD_PUBLIC_KEY non définie, vérification de signature désactivée');
        return true; // Accepter si pas de clé publique configurée
    }
    
    try {
        const message = Buffer.from(timestamp + body);
        const signatureBuffer = Buffer.from(signature, 'hex');
        const publicKeyBuffer = Buffer.from(publicKey, 'hex');
        
        return nacl.sign.detached.verify(message, signatureBuffer, publicKeyBuffer);
    } catch (error) {
        console.error('[INTERACTIONS] Erreur lors de la vérification de signature:', error);
        return false;
    }
}

// Endpoint Discord Interactions (UNIQUEMENT pour Discord Activities)
// IMPORTANT: Cet endpoint ne doit PAS être configuré comme "Interactions Endpoint URL" principal
// Il doit être uniquement dans "Activity URL Override" pour les Activities
// Les interactions normales (slash commands, boutons, modals) passent par WebSocket via discord.js
app.post('/api/interactions', async (req, res) => {
    // Définir les headers de réponse immédiatement
    res.setHeader('Content-Type', 'application/json');
    
    try {
        const signature = req.headers['x-signature-ed25519'];
        const timestamp = req.headers['x-signature-timestamp'];
        
        // Logger les headers pour debug
        console.log('[INTERACTIONS] Headers reçus:', {
            'x-signature-ed25519': signature ? 'présent' : 'absent',
            'x-signature-timestamp': timestamp ? 'présent' : 'absent',
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        });

        let body;
        let interaction;
        
        try {
            // Parser le body (peut être Buffer ou string)
            if (Buffer.isBuffer(req.body)) {
                body = req.body.toString('utf8');
            } else if (typeof req.body === 'string') {
                body = req.body;
            } else {
                body = JSON.stringify(req.body);
            }
            
            if (!body || body.trim() === '') {
                console.error('[INTERACTIONS] Body vide');
                return res.status(400).json({ error: 'Empty body' });
            }
            
            interaction = JSON.parse(body);
            console.log('[INTERACTIONS] Body parsé:', JSON.stringify({ type: interaction.type, data: interaction.data }));
        } catch (parseError) {
            console.error('[INTERACTIONS] Erreur de parsing:', parseError);
            console.log('[INTERACTIONS] Body brut:', req.body);
            return res.status(400).json({ error: 'Invalid JSON' });
        }
        
        // Vérifier la signature si présente (requis par Discord pour la vérification)
        if (signature && timestamp) {
            const isValid = verifyDiscordSignature(signature, timestamp, body, DISCORD_PUBLIC_KEY);
            if (!isValid) {
                console.error('[INTERACTIONS] ❌ Signature invalide');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.log('[INTERACTIONS] ✅ Signature vérifiée');
        } else {
            // Pour les tests locaux sans signature, on accepte quand même
            console.warn('[INTERACTIONS] ⚠️ Pas de signature (test local?)');
        }
        
        // Type 1 = PING (vérification Discord) - DOIT être la première chose à vérifier
        if (interaction.type === 1) {
            console.log('[INTERACTIONS] ✅ PING reçu, renvoi PONG immédiatement');
            // Réponse exacte requise par Discord : { type: 1 }
            return res.status(200).json({ type: 1 });
        }
        
        // Type 2 = APPLICATION_COMMAND (commande slash)
        if (interaction.type === 2) {
            const commandName = interaction.data?.name;
            console.log('[INTERACTIONS] ✅ Commande reçue:', commandName);
            
            // Ne traiter QUE la commande /activity pour les Discord Activities
            // Toutes les autres commandes sont gérées par le bot Discord via WebSocket
            if (commandName === 'activity') {
                console.log('[INTERACTIONS] ✅ Commande /activity détectée - Traitement de l\'Activity');
                const gameUrl = `${process.env.WEB_VERIFICATION_URL || 'https://emynona.shop'}/game`;
                return res.status(200).json({
                    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                    data: {
                        content: '🎰 Lancement de la Roue de la Fortune !',
                        components: [{
                            type: 1, // ACTION_ROW
                            components: [{
                                type: 2, // BUTTON
                                style: 5, // LINK
                                label: '🎲 Jouer Maintenant',
                                url: gameUrl
                            }]
                        }]
                    }
                });
            }
            
            // ⚠️ ATTENTION: Si vous voyez ce message, cela signifie que l'endpoint est mal configuré
            // 
            // PROBLÈME: Une commande autre que /activity a été reçue sur cet endpoint.
            // Cela signifie probablement que l'endpoint est configuré comme "Interactions Endpoint URL" principal.
            //
            // SOLUTION REQUISE:
            // 1. Allez dans Discord Developer Portal > Application > General Information
            // 2. Supprimez ou désactivez "Interactions Endpoint URL" (doit être VIDE)
            // 3. Allez dans "Activities" et configurez "Activity URL Override" avec cette URL
            // 4. Cochez "Utiliser la dérogation d'URL d'Activité"
            //
            // RÉSULTAT ATTENDU:
            // - Les commandes normales (/help, /verify, etc.) passeront par WebSocket (discord.js)
            // - Seule la commande /activity passera par cet endpoint HTTP
            //
            console.error('[INTERACTIONS] ❌ ERREUR DE CONFIGURATION DÉTECTÉE');
            console.error('[INTERACTIONS] ❌ Commande non-activity reçue:', commandName);
            console.error('[INTERACTIONS] ❌ Cet endpoint ne devrait recevoir QUE /activity');
            console.error('[INTERACTIONS] ❌ L\'endpoint est probablement configuré comme endpoint principal');
            console.error('[INTERACTIONS] ❌ Consultez DISCORD_INTERACTIONS_SETUP.md pour la configuration correcte');
            
            // Retourner un ACK pour éviter l'erreur "n'a pas répondu à temps"
            // MAIS: L'interaction ne sera PAS traitée par le bot si l'endpoint est configuré comme principal
            // La commande ne fonctionnera pas correctement jusqu'à ce que la configuration soit corrigée
            return res.status(200).json({ type: 1 }); // ACK immédiat (évite timeout)
        }
        
        // Type 3 = MESSAGE_COMPONENT (boutons, menus)
        // Ces interactions sont gérées par le bot Discord via WebSocket, pas par cet endpoint
        if (interaction.type === 3) {
            console.error('[INTERACTIONS] ❌ Composant reçu (ne devrait PAS arriver ici):', interaction.data?.custom_id);
            console.error('[INTERACTIONS] ❌ Vérifiez la configuration dans Discord Developer Portal');
            return res.status(200).json({ type: 1 }); // ACK immédiat (évite timeout)
        }
        
        // Type 5 = MODAL_SUBMIT
        // Ces interactions sont gérées par le bot Discord via WebSocket, pas par cet endpoint
        if (interaction.type === 5) {
            console.error('[INTERACTIONS] ❌ Modal soumis (ne devrait PAS arriver ici):', interaction.data?.custom_id);
            console.error('[INTERACTIONS] ❌ Vérifiez la configuration dans Discord Developer Portal');
            return res.status(200).json({ type: 1 }); // ACK immédiat (évite timeout)
        }
        
        // Réponse par défaut (ACK)
        console.log('[INTERACTIONS] Type inconnu:', interaction.type, '- ACK par défaut');
        return res.status(200).json({ type: 1 });
        
    } catch (error) {
        console.error('[INTERACTIONS] Erreur:', error);
        console.error('[INTERACTIONS] Stack:', error.stack);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint de vérification Discord (GET pour la vérification initiale)
// Note: Discord utilise principalement POST, mais on garde GET pour les tests
// Endpoint GET pour vérification (Discord peut faire des requêtes GET pour vérifier l'endpoint)
app.get('/api/interactions', (req, res) => {
    console.log('[INTERACTIONS] Requête GET de vérification reçue');
    res.json({ status: 'ok', message: 'Interactions endpoint is active' });
});

// API pour obtenir l'URL OAuth2
app.get('/api/oauth/url', (req, res) => {
    console.log('[OAUTH] Requête pour obtenir l\'URL OAuth2');
    
    if (!DISCORD_CLIENT_ID) {
        console.error('[OAUTH] ❌ DISCORD_CLIENT_ID non configuré');
        return res.status(500).json({ 
            success: false, 
            message: 'DISCORD_CLIENT_ID non configuré' 
        });
    }

    const redirectUri = DISCORD_REDIRECT_URI || 'https://emynona.shop/auth/callback';
    const scope = 'identify guilds guilds.join';
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    
    console.log('[OAUTH] ✅ URL générée:', authUrl);
    console.log('[OAUTH] Redirect URI:', redirectUri);
    
    res.json({ success: true, authUrl });
});

// Callback Discord OAuth2 (pour les redirections depuis Discord)
app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.redirect(`/?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        // Échanger le code contre un token d'accès
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error('Impossible d\'obtenir le token d\'accès');
        }

        // Obtenir les informations utilisateur
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const userData = await userResponse.json();

        if (!userData.id) {
            throw new Error('Impossible d\'obtenir les informations utilisateur');
        }

        // Envoyer la vérification au bot via l'API
        if (!BOT_API_KEY) {
            throw new Error('Configuration manquante : BOT_API_KEY non définie');
        }

        console.log(`[VERIFY] Envoi de la vérification pour ${userData.username}#${userData.discriminator} (${userData.id})`);
        
        const botResponse = await fetch(`${BOT_API_URL}/api/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BOT_API_KEY
            },
            body: JSON.stringify({
                userId: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar,
                guildId: GUILD_ID,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                scope: tokenData.scope
            })
        });

        if (!botResponse.ok) {
            const errorText = await botResponse.text();
            console.error(`[VERIFY] Erreur HTTP ${botResponse.status}:`, errorText);
            throw new Error(`Erreur du serveur bot: ${botResponse.status} - ${errorText}`);
        }

        const botResult = await botResponse.json();
        console.log('[VERIFY] Réponse du bot:', botResult);

        if (!botResult.success) {
            throw new Error(botResult.message || 'Erreur lors de la vérification');
        }

        // Rediriger vers la page de vérification avec succès
        res.redirect('/verify?success=true');

    } catch (error) {
        console.error('Erreur de vérification:', error);
        res.redirect(`/verify?error=${encodeURIComponent(error.message)}`);
    }
});

// API de vérification (pour les appels AJAX)
app.post('/api/verify', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, message: 'Code manquant' });
    }

    try {
        // Échanger le code contre un token d'accès
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            throw new Error('Impossible d\'obtenir le token d\'accès');
        }

        // Obtenir les informations utilisateur
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const userData = await userResponse.json();

        if (!userData.id) {
            throw new Error('Impossible d\'obtenir les informations utilisateur');
        }

        // Envoyer la vérification au bot via l'API
        if (!BOT_API_KEY) {
            return res.status(500).json({ success: false, message: 'Configuration manquante : BOT_API_KEY non définie' });
        }

        console.log(`[VERIFY] Envoi de la vérification pour ${userData.username}#${userData.discriminator} (${userData.id})`);
        
        const botResponse = await fetch(`${BOT_API_URL}/api/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BOT_API_KEY
            },
            body: JSON.stringify({
                userId: userData.id,
                username: userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar,
                guildId: GUILD_ID,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                scope: tokenData.scope
            })
        });

        if (!botResponse.ok) {
            const errorText = await botResponse.text();
            console.error(`[VERIFY] Erreur HTTP ${botResponse.status}:`, errorText);
            return res.status(botResponse.status).json({ 
                success: false, 
                message: `Erreur du serveur bot: ${botResponse.status}`,
                error: errorText 
            });
        }

        const botResult = await botResponse.json();
        console.log('[VERIFY] Réponse du bot:', botResult);

        if (!botResult.success) {
            return res.status(400).json({ 
                success: false, 
                message: botResult.message || 'Erreur lors de la vérification' 
            });
        }

        res.json({ success: true, message: 'Vérification réussie', data: botResult });

    } catch (error) {
        console.error('Erreur de vérification:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// API pour obtenir le solde d'un utilisateur
app.get('/api/currency/balance', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId manquant' });
        }

        if (!BOT_API_URL || !BOT_API_KEY) {
            return res.status(500).json({ success: false, message: 'Configuration manquante' });
        }

        const botResponse = await fetch(`${BOT_API_URL}/api/currency/balance?userId=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BOT_API_KEY
            }
        });

        if (!botResponse.ok) {
            return res.status(botResponse.status).json({ success: false, message: 'Erreur du serveur bot' });
        }

        const data = await botResponse.json();
        res.json(data);
    } catch (error) {
        console.error('[CURRENCY] Erreur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// API pour dépenser des coins
app.post('/api/currency/spend', async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        
        if (!userId || !amount || !reason) {
            return res.status(400).json({ success: false, message: 'Données manquantes' });
        }

        if (!BOT_API_URL || !BOT_API_KEY) {
            return res.status(500).json({ success: false, message: 'Configuration manquante' });
        }

        const botResponse = await fetch(`${BOT_API_URL}/api/currency/spend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BOT_API_KEY
            },
            body: JSON.stringify({ userId, amount, reason })
        });

        if (!botResponse.ok) {
            const errorData = await botResponse.json();
            return res.status(botResponse.status).json({ success: false, message: errorData.message || 'Erreur du serveur bot' });
        }

        const data = await botResponse.json();
        res.json(data);
    } catch (error) {
        console.error('[CURRENCY] Erreur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// API pour sauvegarder les récompenses gagnées
app.post('/api/rewards/claim', async (req, res) => {
    try {
        const { userId, rewardId, rewardName, rewardType, discount } = req.body;
        
        if (!userId || !rewardId || !rewardName) {
            return res.status(400).json({ success: false, message: 'Données manquantes' });
        }

        console.log(`[REWARDS] Récompense réclamée: ${rewardName} (${rewardId}) par utilisateur ${userId}`);
        
        if (!BOT_API_URL || !BOT_API_KEY) {
            return res.status(500).json({ success: false, message: 'Configuration manquante' });
        }

        const botResponse = await fetch(`${BOT_API_URL}/api/rewards/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BOT_API_KEY
            },
            body: JSON.stringify({ userId, rewardId, rewardName, rewardType, discount })
        });

        if (!botResponse.ok) {
            const errorData = await botResponse.json();
            return res.status(botResponse.status).json({ success: false, message: errorData.message || 'Erreur du serveur bot' });
        }

        const data = await botResponse.json();
        res.json(data);
    } catch (error) {
        console.error('[REWARDS] Erreur:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur de vérification démarré sur le port ${PORT}`);
    console.log(`🌐 URL: https://emynona.shop`);
    console.log(`📋 Configuration requise:`);
    console.log(`   - DISCORD_CLIENT_ID: ${DISCORD_CLIENT_ID ? '✅' : '❌'}`);
    console.log(`   - DISCORD_CLIENT_SECRET: ${DISCORD_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`   - GUILD_ID: ${GUILD_ID ? '✅' : '❌'}`);
    console.log(`   - BOT_API_URL: ${BOT_API_URL ? '✅' : '❌'}`);
    console.log(`   - BOT_API_KEY: ${BOT_API_KEY ? '✅' : '❌'}`);
});

