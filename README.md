# Helix

Local-first AI workspace: chat, image studio, and more. Run fully offline after a one-time install.

## Download & run (local, all AI included)

**Requirements:** Node 20+, git, curl, Python 3.11+ (3.12 recommended), ~20 GB free disk for full install.

```bash
git clone https://github.com/tackleguy/Helix.git Helix-1
cd Helix-1

# One-time install: app + llama-server + Qwen chat model + ComfyUI + FLUX
npm run install:local

# Start chat (:8080), images (:8188), and Helix UI (:3000)
npm run start:local
```

Open **http://localhost:3000**

| Service | URL | Purpose |
|---------|-----|---------|
| Helix UI | http://localhost:3000 | Web app |
| Chat | http://127.0.0.1:8080 | llama-server (Qwen 7B) |
| Images | http://127.0.0.1:8188 | ComfyUI (FLUX Schnell) |

### Quick install (chat only, ~5 GB)

```bash
npm run install:local:quick
npm run start:local
```

### Stop

```bash
npm run stop:local
```

### Layout

Install creates sibling folders next to the repo:

```
Helix/
  Helix-1/          ← this repo
  llama-bin/        ← llama-server binary
  llama.cpp/models/ ← GGUF weights
  ComfyUI/          ← image backend + FLUX checkpoint
```

Data is stored in `~/.helix/` (database, generated images, logs).

### Cloud mode (Vercel + Hugging Face)

For hosted deploy, set `HF_API_KEY` and `AI_PROVIDER=huggingface` on Vercel. See `.env.example`.

To switch local dev back to HF after using local-only:

```bash
# In .env.local — comment out or remove:
# AI_LOCAL_ONLY=true
AI_PROVIDER=huggingface
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run install:local` | Full offline bundle install |
| `npm run install:local:quick` | Chat only (skip ComfyUI/FLUX) |
| `npm run start:local` | Start all local services + dev server |
| `npm run stop:local` | Stop background services |
| `npm run dev` | Helix UI only (backends must be running) |

## Docs

- [Local models (llama-server)](docs/LOCAL_MODELS.md)
- [Environment variables](.env.example)
