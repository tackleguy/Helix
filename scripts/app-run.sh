#!/usr/bin/env bash
# Runtime for packaged Helix.app — install AI on first launch, start stack, open browser.
set -euo pipefail

export HELIX_APP_BUNDLE=1
export AI_LOCAL_ONLY=true
export AI_PROVIDER=local
export AI_PREFER_LOCAL=true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/lib/paths.sh
source "$SCRIPT_DIR/lib/paths.sh"
resolve_helix_paths "$SCRIPT_DIR"

LOG_DIR="$HELIX_HOME/logs"
PID_DIR="$HELIX_HOME/run"
PORT="${HELIX_PORT:-3000}"
CHAT_MODEL="${HELIX_CHAT_MODEL:-qwen-7b}"
NODE_BIN="${HELIX_NODE:-node}"

mkdir -p "$LOG_DIR" "$PID_DIR" "$HELIX_WORKSPACE"

stop_one() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    kill "$pid" 2>/dev/null || true
    rm -f "$pidfile"
  fi
}

cleanup() {
  stop_one llama
  stop_one comfy
  stop_one helix
}
trap cleanup EXIT INT TERM

# --- First launch: download AI stack into ~/.helix/workspace ---
if [[ ! -f "$HELIX_WORKSPACE/.helix-installed" ]]; then
  osascript -e 'display notification "Downloading local AI models. This can take 30+ minutes on first launch." with title "Helix"' 2>/dev/null || true
  bash "$HELIX_ROOT/scripts/install-local.sh" >>"$LOG_DIR/install.log" 2>&1 || {
    osascript -e 'display alert "Helix install failed" message "See ~/.helix/logs/install.log"' 2>/dev/null || true
    exit 1
  }
fi

# --- Ensure .env.local ---
if [[ ! -f "$HELIX_ROOT/.env.local" ]]; then
  cat >"$HELIX_ROOT/.env.local" <<'EOF'
AI_LOCAL_ONLY=true
AI_PROVIDER=local
AI_PREFER_LOCAL=true
EOF
fi

# --- Backends ---
if [[ -x "$HELIX_WORKSPACE/llama-bin/llama-server" ]]; then
  nohup bash "$HELIX_ROOT/scripts/serve-llama.sh" "$CHAT_MODEL" \
    >>"$LOG_DIR/llama-server.log" 2>&1 &
  echo $! >"$PID_DIR/llama.pid"
fi

if [[ -f "$HELIX_WORKSPACE/ComfyUI/main.py" ]]; then
  nohup bash "$HELIX_ROOT/scripts/serve-comfyui.sh" \
    >>"$LOG_DIR/comfyui.log" 2>&1 &
  echo $! >"$PID_DIR/comfy.pid"
fi

echo "[helix] waiting for backends…" >>"$LOG_DIR/helix.log"
for _ in $(seq 1 60); do
  CHAT_OK=0
  COMFY_OK=1
  curl -sf -m 2 "http://127.0.0.1:8080/v1/models" >/dev/null 2>&1 && CHAT_OK=1
  if [[ -f "$HELIX_WORKSPACE/ComfyUI/main.py" ]]; then
    COMFY_OK=0
    curl -sf -m 2 "http://127.0.0.1:8188/" >/dev/null 2>&1 && COMFY_OK=1
  fi
  if [[ "$CHAT_OK" -eq 1 && "$COMFY_OK" -eq 1 ]]; then
    break
  fi
  sleep 2
done

# --- Next.js production server ---
cd "$HELIX_ROOT"
export PORT
export HOSTNAME=127.0.0.1
export NODE_ENV=production

nohup "$NODE_BIN" server.js >>"$LOG_DIR/helix.log" 2>&1 &
echo $! >"$PID_DIR/helix.pid"

for _ in $(seq 1 30); do
  if curl -sf -m 1 "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    open "http://127.0.0.1:$PORT"
    break
  fi
  sleep 1
done

# Keep app alive while server runs
wait "$(cat "$PID_DIR/helix.pid")" 2>/dev/null || sleep infinity
