#!/bin/bash

# Script pour définir des coins infinis à un utilisateur sur le VPS
# Usage: ./set-infinite-coins-vps.sh USER_ID

USER_ID=${1:-"1081288703491719378"}

echo "🚀 Définition de coins infinis pour l'utilisateur: $USER_ID"

cd /home/bot

# Exécuter le script TypeScript
pnpm run set-infinite-coins

echo "✅ Script exécuté !"
echo "💡 Pour changer l'utilisateur, modifiez USER_ID dans scripts/set-infinite-coins.ts"

