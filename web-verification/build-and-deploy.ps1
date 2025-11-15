# Script de build et déploiement pour Emynona Market (Windows)
Write-Host "🚀 Emynona Market - Build & Deploy Script" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer d'abord." -ForegroundColor Red
    exit 1
}

# Vérifier si npm est installé
try {
    $npmVersion = npm --version
    Write-Host "✅ npm détecté: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas installé. Veuillez l'installer d'abord." -ForegroundColor Red
    exit 1
}

# Installer les dépendances
Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dépendances installées" -ForegroundColor Green

# Vérifier si le fichier .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Fichier .env manquant. Création à partir de env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "📝 Veuillez configurer le fichier .env avec vos valeurs" -ForegroundColor Yellow
    Write-Host "   Variables requises:" -ForegroundColor Yellow
    Write-Host "   - DISCORD_CLIENT_ID" -ForegroundColor Yellow
    Write-Host "   - DISCORD_CLIENT_SECRET" -ForegroundColor Yellow
    Write-Host "   - DISCORD_TOKEN" -ForegroundColor Yellow
    Write-Host "   - GUILD_ID" -ForegroundColor Yellow
    Write-Host "   - VERIFIED_ROLE_ID" -ForegroundColor Yellow
    Write-Host "   - UNVERIFIED_ROLE_ID" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green

# Build de l'application React
Write-Host "🔨 Build de l'application React..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build React" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build React terminé" -ForegroundColor Green

# Vérifier si le dossier build existe
if (-not (Test-Path "build")) {
    Write-Host "❌ Dossier build non trouvé" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dossier build créé" -ForegroundColor Green

# Démarrer le serveur
Write-Host "🌐 Démarrage du serveur..." -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3000" -ForegroundColor White
Write-Host "   Pour arrêter: Ctrl+C" -ForegroundColor White
Write-Host ""

# Démarrer le serveur
Write-Host "🎉 Emynona Market est maintenant en ligne !" -ForegroundColor Green
Write-Host "   Ouvrez http://localhost:3000 dans votre navigateur" -ForegroundColor White
Write-Host ""
Write-Host "📋 Pour le déploiement en production:" -ForegroundColor Yellow
Write-Host "   1. Configurez votre VPS" -ForegroundColor White
Write-Host "   2. Installez PM2: npm install -g pm2" -ForegroundColor White
Write-Host "   3. Démarrez avec PM2: pm2 start server.js --name emynona-verification" -ForegroundColor White
Write-Host "   4. Configurez Nginx comme reverse proxy" -ForegroundColor White
Write-Host ""

# Démarrer le serveur
npm run server






