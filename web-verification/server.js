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

// Servir les fichiers statiques depuis le dossier build (application React compilée)
app.use(express.static(path.join(__dirname, 'build')));

// Headers pour compatibilité Discord Activities (iframe)
app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://discord.com https://*.discord.com");
    next();
});

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

// Endpoint Discord Interactions (pour Discord Activities)
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
            console.log('[INTERACTIONS] Commande reçue:', interaction.data?.name);
            // Pour les Discord Activities, on peut simplement rediriger vers la page de vérification
            return res.status(200).json({
                type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                data: {
                    content: '🔗 Redirection vers la page de vérification...',
                    components: [{
                        type: 1, // ACTION_ROW
                        components: [{
                            type: 2, // BUTTON
                            style: 5, // LINK
                            label: '🚀 Se Vérifier',
                            url: `${process.env.WEB_VERIFICATION_URL || 'https://emynona.shop'}/verify`
                        }]
                    }]
                }
            });
        }
        
        // Type 3 = MESSAGE_COMPONENT (boutons, menus)
        if (interaction.type === 3) {
            console.log('[INTERACTIONS] Composant reçu:', interaction.data?.custom_id);
            return res.status(200).json({ type: 1 }); // ACK
        }
        
        // Type 5 = MODAL_SUBMIT
        if (interaction.type === 5) {
            console.log('[INTERACTIONS] Modal soumis:', interaction.data?.custom_id);
            return res.status(200).json({ type: 1 }); // ACK
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

