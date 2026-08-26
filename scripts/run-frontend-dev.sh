#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/appleforlife/msafirispace"

cd "$ROOT_DIR/frontend"

echo "Starting React on http://127.0.0.1:3000"
DANGEROUSLY_DISABLE_HOST_CHECK=true \
HOST=127.0.0.1 \
PORT=3000 \
WDS_SOCKET_HOST=127.0.0.1 \
npm start
