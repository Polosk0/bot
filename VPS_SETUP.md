# Guide de Configuration VPS

## Installation de pnpm

### Option 1 : Installation via npm (Recommandé)

```bash
# Installer npm si pas déjà installé
sudo apt update
sudo apt install npm -y

# Installer pnpm globalement
npm install -g pnpm

# Vérifier l'installation
pnpm --version
```

### Option 2 : Installation via Corepack (Node.js 16.13+)

```bash
# Activer Corepack
corepack enable

# Installer pnpm
corepack prepare pnpm@latest --activate

# Vérifier l'installation
pnpm --version
```

### Option 3 : Installation directe via script

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Recharger le shell ou exécuter :
source ~/.bashrc

# Vérifier l'installation
pnpm --version
```

## Installation de Node.js (si nécessaire)

### Node.js 18+ (Recommandé)

```bash
# Ajouter le dépôt NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Installer Node.js
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

### Node.js 20+ (Dernière version)

```bash
# Ajouter le dépôt NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

## Après l'installation de pnpm

Une fois pnpm installé, vous pouvez continuer :

```bash
# Aller dans le dossier du projet
cd /home/bot

# Installer les dépendances
pnpm install

# Compiler le projet
pnpm build
```

## Installation de PM2 (Gestionnaire de processus)

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer le bot
pm2 start dist/index.js --name discord-bot

# Sauvegarder la configuration
pm2 save

# Configurer pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

