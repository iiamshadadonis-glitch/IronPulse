#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "DropBeat Dance Studio V1.36"
echo "Target Cloudflare Pages project: dance-class-at2"
echo "1/4 Installing dependencies..."
npm install
echo "2/4 Running the complete V1.36 verification suite..."
npm run test:dance-v1.36
echo "3/4 Applying the existing additive D1 migrations..."
npm run d1:migrate:remote
echo "4/4 Deploying the verified replacement to dance-class-at2..."
npm run deploy
echo "Deployment completed. V1.36 uses unique immutable assets and no-store dashboard shells, so one ordinary refresh loads the replacement."
