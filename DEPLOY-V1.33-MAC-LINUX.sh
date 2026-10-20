#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "DropBeat Dance Studio V1.33"
echo "Target Cloudflare Pages project: dance-class-at2"
echo "1/4 Installing dependencies..."
npm install
echo "2/4 Running the complete verification suite..."
npm run test:dance-v1.33
echo "3/4 Applying the existing additive D1 migrations..."
npm run d1:migrate:remote
echo "4/4 Deploying the verified replacement to dance-class-at2..."
npm run deploy
echo "Deployment completed. V1.33 uses new cache-busted asset names; open the normal site URL and refresh once."
