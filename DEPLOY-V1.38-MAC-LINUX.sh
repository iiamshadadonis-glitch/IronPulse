#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
echo "DropBeat V1.38: installing and checking the complete replacement"
npm install
npm run test:dance-v1.38
npm run deploy
echo "Deployment completed. Refresh once to load the V1.38 mobile assets."

