#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/appleforlife/msafirispace"
BACKEND_SCRIPT="$ROOT_DIR/scripts/run-backend-dev.sh"
FRONTEND_SCRIPT="$ROOT_DIR/scripts/run-frontend-dev.sh"

if [[ ! -x "$BACKEND_SCRIPT" || ! -x "$FRONTEND_SCRIPT" ]]; then
  echo "Expected executable launcher scripts in $ROOT_DIR/scripts"
  exit 1
fi

osascript <<EOF
tell application "Terminal"
  activate
  do script "cd $ROOT_DIR && ./scripts/run-backend-dev.sh"
  do script "cd $ROOT_DIR && ./scripts/run-frontend-dev.sh"
end tell
EOF

sleep 4
open http://127.0.0.1:3000
