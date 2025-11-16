# Guide de Déploiement - Système €mynona Coins

## Commandes pour déployer sur le VPS

### 1. Se connecter au VPS et aller dans le dossier du projet

```bash
ssh votre-utilisateur@votre-vps-ip
cd /chemin/vers/votre/projet
```

### 2. Récupérer les dernières modifications depuis Git

```bash
git pull origin main
```

### 3. Installer/Mettre à jour les dépendances du bot

```bash
cd /chemin/vers/votre/projet
pnpm install
```

### 4. Compiler le bot TypeScript

```bash
pnpm run build
```

### 5. Installer/Mettre à jour les dépendances du web-verification

```bash
cd web-verification
pnpm install
```

### 6. Compiler l'application React

```bash
cd web-verification
pnpm run build
```

### 7. Redémarrer le bot (selon votre système de gestion de processus)

#### Si vous utilisez PM2:
```bash
pm2 restart bot-discord
# ou
pm2 restart all
```

#### Si vous utilisez systemd:
```bash
sudo systemctl restart bot-discord
```

#### Si vous utilisez un script de démarrage:
```bash
# Arrêter le processus actuel
pkill -f "node.*dist/index.js"
# ou
killall node

# Redémarrer (selon votre méthode)
npm start
# ou
node dist/index.js
```

### 8. Redémarrer le serveur web (si nécessaire)

#### Si vous utilisez PM2:
```bash
pm2 restart web-verification
```

#### Si vous utilisez systemd:
```bash
sudo systemctl restart web-verification
```

#### Si vous utilisez directement Node:
```bash
cd web-verification
pkill -f "node.*server.js"
node server.js &
```

### 9. Vérifier que tout fonctionne

```bash
# Vérifier les logs du bot
pm2 logs bot-discord
# ou
tail -f logs/bot.log

# Vérifier les logs du serveur web
pm2 logs web-verification
# ou
tail -f web-verification/logs/server.log
```

## Script de déploiement complet (à adapter selon votre configuration)

Créez un fichier `deploy.sh` dans la racine du projet:

```bash
#!/bin/bash

echo "🚀 Déploiement du système €mynona Coins..."

# Aller dans le dossier du projet
cd /chemin/vers/votre/projet

# Récupérer les modifications
echo "📥 Récupération des modifications..."
git pull origin main

# Installer les dépendances du bot
echo "📦 Installation des dépendances du bot..."
pnpm install

# Compiler le bot
echo "🔨 Compilation du bot..."
pnpm run build

# Installer les dépendances du web
echo "📦 Installation des dépendances du web..."
cd web-verification
pnpm install

# Compiler le web
echo "🔨 Compilation du web..."
pnpm run build

# Retour à la racine
cd ..

# Redémarrer les services
echo "🔄 Redémarrage des services..."

# Avec PM2
if command -v pm2 &> /dev/null; then
    pm2 restart bot-discord
    pm2 restart web-verification
    echo "✅ Services redémarrés avec PM2"
else
    # Avec systemd
    if systemctl is-active --quiet bot-discord; then
        sudo systemctl restart bot-discord
        sudo systemctl restart web-verification
        echo "✅ Services redémarrés avec systemd"
    else
        echo "⚠️  Aucun gestionnaire de processus détecté. Redémarrez manuellement."
    fi
fi

echo "✅ Déploiement terminé!"
```

Rendez-le exécutable:
```bash
chmod +x deploy.sh
```

Puis exécutez-le:
```bash
./deploy.sh
```

## Vérifications post-déploiement

1. **Vérifier que le bot est connecté:**
   - Regardez les logs pour voir "Bot connecté en tant que..."
   - Testez une commande Discord comme `/help`

2. **Vérifier que le système de monnaie fonctionne:**
   - Testez `/balance` pour voir votre solde
   - Testez `/rewards` pour voir les paliers
   - Testez `/activity` pour accéder au système

3. **Vérifier que le web fonctionne:**
   - Accédez à `https://votre-domaine.com/activity`
   - Vérifiez que les composants se chargent correctement

## Notes importantes

- Assurez-vous que toutes les variables d'environnement sont configurées dans votre `.env`
- Vérifiez que les ports sont correctement configurés (bot: 3001, web: 3000)
- Si vous utilisez Nginx, vérifiez que la configuration est à jour
- Les utilisateurs existants auront automatiquement 0 coins au démarrage (normal)

## Rollback en cas de problème

Si quelque chose ne fonctionne pas:

```bash
# Revenir à la version précédente
git checkout HEAD~1

# Recompiler
pnpm run build
cd web-verification && pnpm run build && cd ..

# Redémarrer
pm2 restart all
```

