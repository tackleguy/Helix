# Local run (download & offline)

Helix can run **fully local** after one install — no Hugging Face credits required.

## One command install

From the repo root:

```bash
npm run install:local
```

This will:

1. `npm install` for the Helix app
2. Write `.env.local` with `AI_LOCAL_ONLY=true`
3. Download **llama-server** (macOS/Linux binary)
4. Download **Qwen2.5-7B-Instruct** GGUF (~4.5 GB) for chat
5. Clone **ComfyUI**, install Python deps
6. Download **FLUX Schnell** checkpoint for image generation

**Disk:** ~15–20 GB for the full install.

## Start

```bash
npm run start:local
```

Then open http://localhost:3000

- **Chat** uses llama-server on port **8080**
- **Images** use ComfyUI on port **8188**
- Helix UI on port **3000**

Logs: `~/.helix/logs/`

## Stop

```bash
npm run stop:local
```

## Chat-only (smaller download)

```bash
npm run install:local:quick
```

Skips ComfyUI and FLUX. Image generation will not work until you run the full install.

## Switch back to Hugging Face (cloud)

Edit `.env.local`:

```bash
# AI_LOCAL_ONLY=true    ← disable
AI_PROVIDER=huggingface
HF_API_KEY=hf_...
```

Restart `npm run dev`. Vercel production is unchanged — it always uses cloud env vars.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `llama-server missing` | Run `npm run install:local` |
| ComfyUI offline in Helix | Check http://127.0.0.1:8188 — run `npm run start:local` |
| Chat errors | Ensure port 8080 is free; see `~/.helix/logs/llama-server.log` |
| FLUX model missing | Re-run install; checkpoint should be in `../ComfyUI/models/checkpoints/flux1-schnell.safetensors` |

Manual backend start (separate terminals):

```bash
./scripts/serve-llama.sh qwen-7b
./scripts/serve-comfyui.sh
npm run dev
```
