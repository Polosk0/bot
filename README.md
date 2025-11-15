# Bot Discord €mynona Market

Bot Discord complet avec système de vérification, backup, avis, tickets et modération.

## 🚀 Fonctionnalités

### Système de Vérification
- Vérification OAuth2 via site web
- Intégration Discord Activities
- Attribution automatique de rôles
- Webhook de vérification optionnel

### Système de Backup
- Sauvegarde complète du serveur (rôles, salons, messages, emojis, stickers)
- Restauration avec checkpoint
- Gestion des permissions et hiérarchie
- Support des pièces jointes et images

### Système d'Avis (Vouch)
- Création d'avis avec formulaire modal
- Ajout de photos via URL
- Statistiques d'avis par utilisateur
- Publication dans le salon dédié

### Système de Tickets
- Création de tickets par catégorie (Refund, Boxing)
- Fermeture automatique avec transcript
- Gestion des catégories de tickets

### Modération
- Ban/Kick/Warn
- Clear/Nuke
- Lock/Unlock
- Système de logs détaillés
- Anti-scam automatique

### Découverte
- Formulaire de découverte avec modals
- Suppression automatique des messages utilisateurs
- Publication des réponses dans le canal

### Autres
- Commande `/help` interactive avec boutons
- Commande `/guide` avec guide rapide
- Commande `/activity` pour lancer Discord Activities
- Commande `/discovery` pour le formulaire de découverte
- Système de réinvitation via OAuth

## 📋 Prérequis

- Node.js 18+
- pnpm
- Token Discord Bot
- Application Discord configurée

## 🔧 Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/Polosk0/bot.git
cd bot
```

2. Installer les dépendances :
```bash
pnpm install
```

3. Configurer les variables d'environnement :
```bash
cp env.example .env
```

4. Remplir le fichier `.env` avec vos configurations :
```env
DISCORD_TOKEN=votre_token
DISCORD_CLIENT_ID=votre_client_id
DISCORD_CLIENT_SECRET=votre_client_secret
API_KEY=votre_clé_api
WEB_VERIFICATION_URL=http://localhost:3000
# ... autres variables
```

5. Compiler le projet :
```bash
pnpm build
```

6. Lancer le bot :
```bash
pnpm start
```

## 🌐 Web Verification

Le projet inclut un site web de vérification dans `web-verification/`.

### Installation
```bash
cd web-verification
npm install
```

### Configuration
Copier `env.example` vers `.env` et configurer les variables.

### Build
```bash
npm run build
```

### Démarrage
```bash
node server.js
```

## 📁 Structure du Projet

```
bot/
├── src/
│   ├── commands/        # Commandes slash
│   ├── events/          # Événements Discord
│   ├── managers/        # Gestionnaires (backup, logs, tickets, etc.)
│   ├── database/        # Gestionnaire de base de données
│   ├── types/           # Types TypeScript
│   └── utils/           # Utilitaires
├── web-verification/    # Site web de vérification
├── scripts/             # Scripts utilitaires
└── dist/                # Fichiers compilés
```

## 🔐 Variables d'Environnement

Voir `env.example` pour la liste complète des variables d'environnement.

## 📝 Commandes Disponibles

- `/help` - Aide interactive
- `/guide` - Guide rapide
- `/verify setup` - Configurer la vérification
- `/backup create|restore|list|info|delete` - Gestion des backups
- `/vouch create|stats` - Système d'avis
- `/ticket setup|panel` - Système de tickets
- `/discovery` - Formulaire de découverte
- `/activity` - Lancer Discord Activities
- `/reinvite user|bulk` - Réinviter des membres
- Et plus...

## 🚀 Déploiement

### VPS

1. Cloner le dépôt sur le VPS
2. Installer les dépendances
3. Configurer les variables d'environnement
4. Compiler le projet
5. Utiliser PM2 ou systemd pour gérer le processus

### PM2
```bash
pm2 start dist/index.js --name discord-bot
pm2 save
pm2 startup
```

## 📄 Licence

Propriétaire - €mynona Market

## 🤝 Support

Pour toute question ou problème, contactez l'équipe de développement.

