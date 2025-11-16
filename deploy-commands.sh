#!/bin/bash

set -e

echo "🚀 Déploiement des nouvelles commandes..."
echo ""

# Aller dans le dossier du projet
cd /home/bot

# Récupérer les modifications
echo "📥 Récupération des modifications..."
git pull origin main || {
    echo "⚠️  Conflit détecté, tentative de résolution..."
    git stash
    git pull origin main
}

# Installer les dépendances du bot
echo "📦 Installation des dépendances du bot..."
pnpm install

# Compiler le bot
echo "🔨 Compilation du bot..."
pnpm run build

# Vérifier que les commandes sont compilées
echo "🔍 Vérification des commandes compilées..."
if [ -f "dist/commands/utility/balance.js" ] && [ -f "dist/commands/utility/rewards.js" ] && [ -f "dist/commands/moderation/add-coins.js" ] && [ -f "dist/commands/utility/sync-commands.js" ]; then
    echo "✅ Commandes compilées avec succès"
else
    echo "❌ Erreur: Les commandes ne sont pas compilées correctement"
    exit 1
fi

# Redémarrer le bot
echo "🔄 Redémarrage du bot..."
pm2 restart discord-bot

# Attendre que le bot démarre
echo "⏳ Attente du démarrage du bot (5 secondes)..."
sleep 5

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Attendez 1-2 minutes pour que Discord mette à jour les commandes"
echo "   2. Tapez '/' dans Discord pour voir les nouvelles commandes"
echo "   3. Si les commandes n'apparaissent pas, utilisez /sync-commands (admin)"
echo ""
echo "💡 Pour vérifier les logs manuellement:"
echo "   pm2 logs discord-bot --lines 100 --nostream | grep -E 'Synchronisation|synchronisées'"
echo ""
