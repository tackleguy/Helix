#!/usr/bin/env bash
# Start Helix local stack: llama-server + ComfyUI + Next.js dev server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/paths.sh
source "$ROOT/scripts/lib/paths.sh"
resolve_helix_paths "$ROOT/scripts"
WORKSPACE="$HELIX_WORKSPACE"
LOG_DIR="${HELIX_HOME:-$HOME/.helix}/logs"
PID_DIR="${HELIX_HOME:-$HOME/.helix}/run"
CHAT_MODEL="${HELIX_CHAT_MODEL:-qwen-7b}"

mkdir -p "$LOG_DIR" "$PID_DIR"

stop_one() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "[helix] stopped $name (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
}

if [[ "${1:-}" == "stop" ]]; then
  stop_one llama
  stop_one comfy
  stop_one helix
  pkill -f "llama-server" 2>/dev/null || true
  exit 0
fi

# Stop stale processes from a previous run
"$0" stop 2>/dev/null || true
sleep 1

echo "=== Starting Helix local stack ==="

# --- Chat backend ---
if [[ -x "$WORKSPACE/llama-bin/llama-server" ]]; then
  echo "[helix] starting llama-server ($CHAT_MODEL)…"
  nohup bash "$ROOT/scripts/serve-llama.sh" "$CHAT_MODEL" \
    >"$LOG_DIR/llama-server.log" 2>&1 &
  echo $! >"$PID_DIR/llama.pid"
else
  echo "[helix] warn: llama-server missing — run ./scripts/install-local.sh first"
fi

# --- ComfyUI ---
if [[ -f "$WORKSPACE/ComfyUI/main.py" ]]; then
  echo "[helix] starting ComfyUI on :8188…"
  nohup bash "$ROOT/scripts/serve-comfyui.sh" \
    >"$LOG_DIR/comfyui.log" 2>&1 &
  echo $! >"$PID_DIR/comfy.pid"
else
  echo "[helix] warn: ComfyUI missing — run ./scripts/install-local.sh (or --quick to skip)"
fi

echo "[helix] waiting for backends…"
NEED_COMFY=0
[[ -f "$WORKSPACE/ComfyUI/main.py" ]] && NEED_COMFY=1

for _ in $(seq 1 45); do
  CHAT_OK=0
  COMFY_OK=1
  curl -sf -m 2 "http://127.0.0.1:8080/v1/models" >/dev/null 2>&1 && CHAT_OK=1
  if [[ "$NEED_COMFY" -eq 1 ]]; then
    COMFY_OK=0
    curl -sf -m 2 "http://127.0.0.1:8188/" >/dev/null 2>&1 && COMFY_OK=1
  fi
  if [[ "$CHAT_OK" -eq 1 && "$COMFY_OK" -eq 1 ]]; then
    break
  fi
  sleep 2
done

echo "[helix] chat   → http://127.0.0.1:8080"
echo "[helix] images → http://127.0.0.1:8188"
echo "[helix] app    → http://localhost:3000"
echo "[helix] logs   → $LOG_DIR"
echo ""

cd "$ROOT"
exec npm run dev
