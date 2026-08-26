#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/appleforlife/msafirispace"

cd "$ROOT_DIR"
unset DEBUG
source backend/venv/bin/activate
cd backend

echo "Starting Django on http://127.0.0.1:8000"
python manage.py runserver 127.0.0.1:8000 --noreload
