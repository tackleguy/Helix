#!/usr/bin/env bash
# Helix llama.cpp launcher.
#
# Wraps llama-server with the model aliases the picker expects:
#   llama-3b, qwen-7b, qwen-14b, deepseek-r1, study-helix
#
# Override paths via env if your layout differs:
#   LLAMA_BIN=/path/to/llama-server
#   LLAMA_MODELS=/path/to/models/dir
#
# Default layout (matches the local dev setup):
#   <workspace>/Helix/        <- this repo
#   <workspace>/llama-bin/    <- llama-server binary
#   <workspace>/llama.cpp/    <- source clone (only for the models dir)
#   <workspace>/llama.cpp/models/*.gguf
#
# Usage:
#   ./scripts/serve-llama.sh                # qwen-7b (default)
#   ./scripts/serve-llama.sh llama-3b
#   ./scripts/serve-llama.sh stop
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/lib/paths.sh
source "$SCRIPT_DIR/lib/paths.sh"
resolve_helix_paths "$SCRIPT_DIR"
WORKSPACE="$HELIX_WORKSPACE"
LLAMA_BIN="${LLAMA_BIN:-$WORKSPACE/llama-bin/llama-server}"
LLAMA_MODELS="${LLAMA_MODELS:-$WORKSPACE/llama.cpp/models}"
PORT="${LLAMA_PORT:-8080}"
CTX="${LLAMA_CTX:-4096}"
NGL="${LLAMA_NGL:-99}"

declare -A MODEL_FILES=(
  [llama-3b]="Llama-3.2-3B-Instruct-Q4_K_M.gguf"
  [qwen-7b]="Qwen2.5-7B-Instruct-Q4_K_M.gguf"
  [qwen-14b]="Qwen2.5-14B-Instruct-Q4_K_M.gguf"
  [deepseek-r1]="DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf"
  [study-helix]="Helix-Study-Q4_K_M.gguf"
)

choice="${1:-qwen-7b}"

pkill -f "llama-server" 2>/dev/null && sleep 1 || true

if [[ "$choice" == "stop" ]]; then
  echo "[helix] llama-server stopped."
  exit 0
fi

file="${MODEL_FILES[$choice]:-}"
if [[ -z "$file" ]]; then
  echo "[helix] unknown model: $choice"
  echo "[helix] valid:  ${!MODEL_FILES[*]} stop"
  exit 1
fi

if [[ ! -x "$LLAMA_BIN" ]]; then
  echo "[helix] llama-server binary missing or not executable: $LLAMA_BIN"
  echo "[helix] download a release from https://github.com/ggml-org/llama.cpp/releases"
  echo "[helix] or override with: LLAMA_BIN=/path/to/llama-server $0 $choice"
  exit 1
fi

path="$LLAMA_MODELS/$file"
if [[ ! -f "$path" ]]; then
  echo "[helix] model file missing: $path"
  echo "[helix] download a quant (Q4_K_M) from huggingface, e.g.:"
  case "$choice" in
    llama-3b) repo="bartowski/Llama-3.2-3B-Instruct-GGUF" ;;
    qwen-7b) repo="bartowski/Qwen2.5-7B-Instruct-GGUF" ;;
    qwen-14b) repo="bartowski/Qwen2.5-14B-Instruct-GGUF" ;;
    deepseek-r1) repo="bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF" ;;
    study-helix)
      echo "[helix] study-helix is a custom fine-tune. Build it with:"
      echo "[helix]   ./scripts/build-study-model.sh"
      echo "[helix] Or place Helix-Study-Q4_K_M.gguf in $LLAMA_MODELS"
      exit 1
      ;;
  esac
  echo "[helix]   curl -L -o \"$path\" \\"
  echo "[helix]     https://huggingface.co/$repo/resolve/main/$file"
  exit 1
fi

echo "[helix] starting llama-server with $choice ($file)"
echo "[helix] endpoint: http://127.0.0.1:$PORT/v1"
echo "[helix] alias:    $choice"
echo "[helix] Ctrl-C to stop"
exec "$LLAMA_BIN" \
  -m "$path" \
  --host 127.0.0.1 \
  --port "$PORT" \
  --alias "$choice" \
  -c "$CTX" \
  -ngl "$NGL" \
  --jinja
