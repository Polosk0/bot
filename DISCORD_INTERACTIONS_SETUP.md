# Configuration Discord Interactions - Guide Complet

## 🎯 Objectif

Configurer le système pour que :
- ✅ Les **Discord Activities** (commande `/activity`) passent par l'endpoint `/api/interactions`
- ✅ Les **commandes normales** (slash commands, boutons, modals) passent par WebSocket via discord.js

## 📋 Configuration Discord Developer Portal

### Étape 1 : Vérifier l'Endpoint Principal d'Interactions

1. Allez sur https://discord.com/developers/applications
2. Sélectionnez votre application
3. Allez dans **"General Information"**
4. Cherchez **"Interactions Endpoint URL"**
5. **IMPORTANT** : Ce champ doit être **VIDE** ou **DÉSACTIVÉ**
   - ❌ Ne pas mettre `https://emynona.shop/api/interactions` ici
   - ✅ Laisser vide pour que les interactions normales passent par WebSocket

### Étape 2 : Configurer l'Activity URL Override

1. Dans Discord Developer Portal, allez dans **"Activities"** (ou cherchez "Rich Presence")
2. Trouvez **"Activity URL Override"** (ou "URL Override" pour les Activities)
3. Configurez :
   - **URL** : `https://emynona.shop/api/interactions`
   - ✅ Cochez **"Utiliser la dérogation d'URL d'Activité"** (ou équivalent)

### Étape 3 : Vérifier la Commande /activity

1. Allez dans **"Slash Commands"** ou **"Commands"**
2. Vérifiez que la commande `/activity` existe
3. Si elle n'existe pas, exécutez le script :
   ```bash
   cd scripts
   pnpm ts-node register-activity-command.ts
   ```

## 🔍 Vérification

### Test 1 : Commande normale (doit passer par WebSocket)
- Utilisez `/help` dans Discord
- ✅ Doit fonctionner normalement
- ✅ Le bot doit répondre via WebSocket (pas d'appel à `/api/interactions`)

### Test 2 : Commande Activity (doit passer par HTTP)
- Utilisez `/activity` dans Discord
- ✅ Doit afficher un message avec un bouton vers le jeu
- ✅ L'appel doit passer par `/api/interactions`

### Vérification des Logs

**Sur le serveur web (port 3000)** :
```bash
pm2 logs web-verification --lines 50
```

Vous devriez voir :
- ✅ `[INTERACTIONS] Commande reçue: activity` (uniquement pour `/activity`)
- ⚠️ Si vous voyez d'autres commandes ici, l'endpoint est mal configuré

**Sur le bot (port 3001)** :
```bash
pm2 logs bot --lines 50
```

Vous devriez voir :
- ✅ Les commandes normales traitées ici (via WebSocket)
- ✅ Pas de `/activity` ici (elle passe par HTTP)

## 🚨 Problèmes Courants

### Problème : Toutes les commandes arrivent sur `/api/interactions`

**Cause** : L'endpoint `/api/interactions` est configuré comme endpoint principal

**Solution** :
1. Allez dans Discord Developer Portal > General Information
2. Supprimez ou désactivez "Interactions Endpoint URL"
3. Utilisez uniquement "Activity URL Override" pour les Activities

### Problème : La commande `/activity` ne fonctionne pas

**Cause** : L'Activity URL Override n'est pas configuré

**Solution** :
1. Allez dans Discord Developer Portal > Activities
2. Configurez "Activity URL Override" avec `https://emynona.shop/api/interactions`
3. Cochez "Utiliser la dérogation d'URL d'Activité"

### Problème : Erreur "n'a pas répondu à temps"

**Cause** : L'endpoint ne répond pas assez vite ou est mal configuré

**Solution** :
1. Vérifiez que l'endpoint `/api/interactions` répond bien aux PING (type 1)
2. Vérifiez que la signature Discord est correctement vérifiée
3. Vérifiez les logs pour voir si l'endpoint reçoit bien les requêtes

## 📝 Résumé de la Configuration

| Élément | Configuration | Où configurer |
|---------|--------------|---------------|
| **Interactions Endpoint URL** | ❌ VIDE (désactivé) | General Information |
| **Activity URL Override** | ✅ `https://emynona.shop/api/interactions` | Activities |
| **Commande /activity** | ✅ Enregistrée | Slash Commands |

## 🔄 Flux des Interactions

```
┌─────────────────────────────────────────────────────────┐
│                    Discord                               │
└─────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼────┐                    ┌────▼────┐
    │ /help   │                    │/activity│
    │ /verify │                    │        │
    │ boutons │                    │        │
    │ modals  │                    │        │
    └────┬────┘                    └────┬────┘
         │                              │
         │                              │
    ┌────▼──────────────────────────────▼────┐
    │         Discord Gateway (WebSocket)     │
    └────┬────────────────────────────────────┘
         │
         │ (interactions normales)
         │
    ┌────▼────────────────────────────────────┐
    │      Bot Discord (discord.js)           │
    │      Port 3001                         │
    │      interactionCreate.ts              │
    └─────────────────────────────────────────┘

         │ (uniquement /activity)
         │
    ┌────▼────────────────────────────────────┐
    │      Web Server (Express)               │
    │      Port 3000                         │
    │      /api/interactions                  │
    └─────────────────────────────────────────┘
```

## ✅ Checklist de Configuration

- [ ] "Interactions Endpoint URL" est VIDE dans Discord Developer Portal
- [ ] "Activity URL Override" est configuré avec `https://emynona.shop/api/interactions`
- [ ] "Utiliser la dérogation d'URL d'Activité" est coché
- [ ] La commande `/activity` est enregistrée
- [ ] Les commandes normales fonctionnent (test avec `/help`)
- [ ] La commande `/activity` fonctionne et affiche le jeu
- [ ] Les logs montrent que seules les Activities passent par `/api/interactions`

