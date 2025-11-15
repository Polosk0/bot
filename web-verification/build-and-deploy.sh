#!/bin/bash

# Script de build et déploiement pour Emynona Market
echo "🚀 Emynona Market - Build & Deploy Script"
echo "=========================================="

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

echo "✅ Node.js et npm détectés"

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"

# Vérifier si le fichier .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env manquant. Création à partir de env.example..."
    cp env.example .env
    echo "📝 Veuillez configurer le fichier .env avec vos valeurs"
    echo "   Variables requises:"
    echo "   - DISCORD_CLIENT_ID"
    echo "   - DISCORD_CLIENT_SECRET"
    echo "   - DISCORD_TOKEN"
    echo "   - GUILD_ID"
    echo "   - VERIFIED_ROLE_ID"
    echo "   - UNVERIFIED_ROLE_ID"
    exit 1
fi

echo "✅ Fichier .env trouvé"

# Build de l'application React
echo "🔨 Build de l'application React..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build React"
    exit 1
fi

echo "✅ Build React terminé"

# Vérifier si le dossier build existe
if [ ! -d "build" ]; then
    echo "❌ Dossier build non trouvé"
    exit 1
fi

echo "✅ Dossier build créé"

# Démarrer le serveur
echo "🌐 Démarrage du serveur..."
echo "   URL: http://localhost:3000"
echo "   Pour arrêter: Ctrl+C"
echo ""

# Démarrer le serveur en arrière-plan
npm run server &
SERVER_PID=$!

# Attendre un peu pour que le serveur démarre
sleep 3

# Vérifier si le serveur fonctionne
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Serveur démarré avec succès (PID: $SERVER_PID)"
    echo ""
    echo "🎉 Emynona Market est maintenant en ligne !"
    echo "   Ouvrez http://localhost:3000 dans votre navigateur"
    echo ""
    echo "📋 Pour le déploiement en production:"
    echo "   1. Configurez votre VPS"
    echo "   2. Installez PM2: npm install -g pm2"
    echo "   3. Démarrez avec PM2: pm2 start server.js --name emynona-verification"
    echo "   4. Configurez Nginx comme reverse proxy"
    echo ""
    echo "Appuyez sur Ctrl+C pour arrêter le serveur"
    
    # Attendre que l'utilisateur arrête le serveur
    wait $SERVER_PID
else
    echo "❌ Erreur lors du démarrage du serveur"
    exit 1
fi






