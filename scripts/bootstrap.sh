#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_DIR/.env"
EXAMPLE_FILE="$REPO_DIR/.env.example"
if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f "$EXAMPLE_FILE" ]; then
    echo "Missing .env.example" >&2
    exit 1
  fi
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo "Created .env from .env.example. Please edit it with your API credentials." >&2
fi
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi
python3 -m venv "$REPO_DIR/.venv"
source "$REPO_DIR/.venv/bin/activate"
pip install --upgrade pip >/dev/null
if [ -f "$REPO_DIR/requirements.txt" ]; then
  pip install -r "$REPO_DIR/requirements.txt" >/dev/null
fi
echo "Bootstrap complete."
