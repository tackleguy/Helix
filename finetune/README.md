# Study Helix — fine-tuning (study-only AI)

Train **Study Helix**: a model that only helps with studying — explanations, flashcards, exam prep, and polite refusals for off-topic requests.

## One-command build (Mac Apple Silicon)

From the repo root:

```bash
npm run study:build
npm run study:serve   # llama-server on study-helix
npm run dev           # Helix UI → sidebar **Study**
```

Quick smoke test (fewer training steps):

```bash
npm run study:build:quick
```

## What gets created

| Output | Purpose |
|--------|---------|
| `finetune/data/train.jsonl` | 40+ study-only chat examples |
| `finetune/adapters/study/` | LoRA weights (MLX) |
| `finetune/fused/study-helix/` | Merged Hugging Face weights |
| `../llama.cpp/models/Helix-Study-Q4_K_M.gguf` | Local inference for Helix |

## Helix integration

- **Study** in the sidebar → session with `study-helix` model + enforced system prompt
- `lib/study/constants.ts` — study-only rules (also applied in `/api/chat`)
- `./scripts/serve-llama.sh study-helix` — serves the fine-tuned GGUF

## Colab / NVIDIA (Unsloth)

If you prefer Colab instead of Mac MLX:

```bash
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install -r requirements.txt
python build_study_dataset.py
python train.py --max-steps 300
python export_gguf.py
```

Copy the GGUF to `llama.cpp/models/Helix-Study-Q4_K_M.gguf`.

## Files

| File | Purpose |
|------|---------|
| `build_study_dataset.py` | Regenerate study-only `train.jsonl` |
| `train.py` | Unsloth training (CUDA / Colab) |
| `train_mlx` via `scripts/build-study-model.sh` | MLX LoRA on Apple Silicon |
| `chat.py` | Terminal test |
| `export_gguf.py` | Unsloth GGUF export |
| `system_prompt.txt` | Study persona for CLI / Ollama |

## Improve the model

1. Add rows to `build_study_dataset.py` (especially refusal examples).
2. Run `npm run study:build` again.
3. Keep Helix **Study** sessions on model `study-helix` — the app enforces the study system prompt even if the UI prompt is cleared.
