#!/usr/bin/env bash
# Train Study Helix (study-only LoRA) on Apple Silicon via MLX, export GGUF for llama-server.
#
# Usage:
#   ./scripts/build-study-model.sh          # full pipeline
#   ./scripts/build-study-model.sh --quick  # fewer iterations (smoke test)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FINETUNE="$ROOT/finetune"
VENV="$FINETUNE/.venv"
WORKSPACE="$(cd "$ROOT/.." && pwd)"
LLAMA_MODELS="${LLAMA_MODELS:-$WORKSPACE/llama.cpp/models}"
GGUF_NAME="Helix-Study-Q4_K_M.gguf"
BASE_MODEL="mlx-community/Llama-3.2-3B-Instruct-4bit"
ITERS=800
BATCH=2
LAYERS=16

if [[ "${1:-}" == "--quick" ]]; then
  ITERS=120
  echo "[study] quick mode: $ITERS iterations"
fi

echo "[study] Building dataset…"
python3 "$FINETUNE/build_study_dataset.py"

if [[ ! -d "$VENV" ]]; then
  echo "[study] Creating Python venv…"
  python3 -m venv "$VENV"
fi
# shellcheck source=/dev/null
source "$VENV/bin/activate"
pip install -q --upgrade pip
pip install -q mlx-lm huggingface_hub

mkdir -p "$FINETUNE/adapters" "$FINETUNE/fused" "$FINETUNE/data"

echo "[study] LoRA training ($ITERS iters) — this can take 20–60 min on Apple Silicon…"
python -m mlx_lm lora \
  --model "$BASE_MODEL" \
  --train \
  --data "$FINETUNE/data" \
  --fine-tune-type lora \
  --batch-size "$BATCH" \
  --num-layers "$LAYERS" \
  --iters "$ITERS" \
  --adapter-path "$FINETUNE/adapters/study" \
  --mask-prompt \
  --steps-per-report 10 \
  --steps-per-eval 50

mkdir -p "$LLAMA_MODELS" "$FINETUNE/fused"

echo "[study] Fusing adapters (dequantized HF weights)…"
python -m mlx_lm fuse \
  --model "$BASE_MODEL" \
  --adapter-path "$FINETUNE/adapters/study" \
  --save-path "$FINETUNE/fused/study-helix" \
  --dequantize

CONVERT=""
for candidate in \
  "$WORKSPACE/llama.cpp/convert_hf_to_gguf.py" \
  "$WORKSPACE/llama.cpp/tools/convert_hf_to_gguf.py"; do
  if [[ -f "$candidate" ]]; then
    CONVERT="$candidate"
    break
  fi
done

if [[ -z "$CONVERT" ]]; then
  echo "[study] llama.cpp convert_hf_to_gguf.py not found under $WORKSPACE/llama.cpp"
  exit 1
fi

echo "[study] Converting to GGUF (llama.cpp)…"
pip install -q torch 2>/dev/null || true
python "$CONVERT" "$FINETUNE/fused/study-helix" \
  --outfile "$LLAMA_MODELS/$GGUF_NAME" \
  --outtype q8_0

if [[ -f "$LLAMA_MODELS/$GGUF_NAME" ]]; then
  echo "[study] GGUF ready: $LLAMA_MODELS/$GGUF_NAME"
else
  echo "[study] GGUF export failed. Adapters at: $FINETUNE/adapters/study"
  exit 1
fi

echo "[study] Done. Start the model with:"
echo "  ./scripts/serve-llama.sh study-helix"
echo "  npm run dev"
echo "  Open Helix → Study"
