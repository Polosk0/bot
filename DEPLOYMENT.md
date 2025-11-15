# Guide de Déploiement VPS

## 📍 Emplacement du Projet

Sur votre VPS, clonez le projet dans le répertoire home de votre utilisateur :

```bash
# Se connecter au VPS
ssh votre_utilisateur@votre_ip

# Aller dans le répertoire home
cd ~

# Cloner le dépôt
git clone https://github.com/Polosk0/bot.git

# Aller dans le dossier du projet
cd bot
```

## 🔧 Installation

### 1. Installer Node.js et pnpm

```bash
# Installer Node.js 18+ (si pas déjà installé)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer pnpm
npm install -g pnpm
```

### 2. Installer les dépendances

```bash
# Dans le dossier bot/
pnpm install
```

### 3. Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer le fichier .env avec vos valeurs
nano .env
```

### 4. Compiler le projet

```bash
pnpm build
```

## 🚀 Démarrage avec PM2

### Installer PM2

```bash
npm install -g pm2
```

### Démarrer le bot

```bash
# Démarrer le bot
pm2 start dist/index.js --name discord-bot

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

### Commandes PM2 utiles

```bash
# Voir les logs
pm2 logs discord-bot

# Redémarrer
pm2 restart discord-bot

# Arrêter
pm2 stop discord-bot

# Voir le statut
pm2 status

# Monitoring
pm2 monit
```

## 🌐 Web Verification (Optionnel)

Si vous voulez aussi déployer le site web de vérification :

```bash
cd web-verification

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp env.example .env
nano .env

# Build
npm run build

# Démarrer avec PM2
pm2 start server.js --name web-verification
```

## 📝 Structure Recommandée

```
/home/votre_utilisateur/
└── bot/
    ├── src/
    ├── dist/
    ├── .env
    ├── package.json
    └── ...
```

## 🔄 Mise à Jour

Pour mettre à jour le projet :

```bash
cd ~/bot

# Récupérer les dernières modifications
git pull

# Réinstaller les dépendances si nécessaire
pnpm install

# Recompiler
pnpm build

# Redémarrer avec PM2
pm2 restart discord-bot
```

## 🔐 Sécurité

- Ne jamais commiter le fichier `.env`
- Utiliser des permissions restrictives pour `.env` : `chmod 600 .env`
- Configurer un firewall si nécessaire
- Utiliser HTTPS pour le web verification

## 📊 Monitoring

PM2 inclut un système de monitoring intégré. Vous pouvez aussi configurer des alertes ou utiliser des outils comme Grafana pour le monitoring avancé.

