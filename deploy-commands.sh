#!/bin/bash

echo "🚀 Déploiement des nouvelles commandes..."

# Aller dans le dossier du projet
cd /home/bot

# Récupérer les modifications
echo "📥 Récupération des modifications..."
git pull origin main

# Installer les dépendances du bot
echo "📦 Installation des dépendances du bot..."
pnpm install

# Compiler le bot
echo "🔨 Compilation du bot..."
pnpm run build

# Vérifier que les commandes sont compilées
echo "🔍 Vérification des commandes compilées..."
if [ -f "dist/commands/utility/balance.js" ] && [ -f "dist/commands/utility/rewards.js" ] && [ -f "dist/commands/moderation/add-coins.js" ]; then
    echo "✅ Commandes compilées avec succès"
else
    echo "❌ Erreur: Les commandes ne sont pas compilées correctement"
    exit 1
fi

# Redémarrer le bot
echo "🔄 Redémarrage du bot..."
pm2 restart discord-bot

# Attendre que le bot démarre
echo "⏳ Attente du démarrage du bot..."
sleep 5

# Vérifier les logs
echo "📋 Vérification des logs de synchronisation..."
pm2 logs discord-bot --lines 200 --nostream 2>/dev/null | grep -E "Synchronisation|synchronisées|Commandes:|balance|rewards|add-coins|sync-commands" | tail -20 || echo "⚠️  Aucune ligne de synchronisation trouvée dans les logs récents"

echo ""
echo "✅ Déploiement terminé!"
echo "💡 Utilisez /sync-commands dans Discord pour forcer la synchronisation si nécessaire"
echo "⏱️  Les commandes devraient apparaître dans Discord dans 1-2 minutes"

