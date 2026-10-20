#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
echo "DropBeat V1.39: installing dependencies and verifying the replacement"
npm install
npm run test:dance-v1.39
npm run deploy
echo "Deployment completed. Refresh once to load V1.39."
