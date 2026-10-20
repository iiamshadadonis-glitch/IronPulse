#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "DropBeat Dance Studio V1.22"
echo "1/4 Installing dependencies..."
npm install
echo "2/4 Running the complete verification suite..."
npm run test:dance-v1.22
echo "3/4 Applying the additive D1 migrations..."
npm run d1:migrate:remote
echo "4/4 Deploying the verified replacement..."
npm run deploy
echo "Deployment completed. Open the website in a private window and follow START-HERE-V1.22.md."
