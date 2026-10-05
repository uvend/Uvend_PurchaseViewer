#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Create .env from .env.example with the konsoleH PostgreSQL details first."
  exit 1
fi

echo 22 > "$HOME/.nodeversion"
export NODEVERSION=22

echo "Node $(node -v)"
npm install
npx prisma migrate deploy
npm run build

echo "Build finished. Enable Node.js in konsoleH with:"
echo "  Script path: node_modules/.bin/next"
echo "  Working directory: $(basename "$PWD")/"
echo "  Arguments: start -H 0.0.0.0"
echo "  Memory limit: 1024 MB"
echo "  Version: 22"
