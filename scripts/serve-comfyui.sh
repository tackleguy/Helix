#!/usr/bin/env bash
# Start ComfyUI for Helix image generation (default :8188).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/lib/paths.sh
source "$SCRIPT_DIR/lib/paths.sh"
resolve_helix_paths "$SCRIPT_DIR"
COMFY_DIR="${COMFY_DIR:-$HELIX_WORKSPACE/ComfyUI}"

if [[ ! -f "$COMFY_DIR/main.py" ]]; then
  echo "ComfyUI not found at $COMFY_DIR"
  echo "Clone: git clone https://github.com/Comfy-Org/ComfyUI.git $COMFY_DIR"
  exit 1
fi

cd "$COMFY_DIR"
if [[ ! -d .venv ]]; then
  python3.12 -m venv .venv
  .venv/bin/pip install -U pip torch torchvision torchaudio
  .venv/bin/pip install -r requirements.txt
fi

exec .venv/bin/python main.py --listen 127.0.0.1 --port "${COMFY_PORT:-8188}"
