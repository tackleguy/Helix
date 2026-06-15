# Helix

Local-first AI workspace: chat, image studio, and more. Run fully offline after a one-time install.

## Downloadable macOS app

Build a **double-clickable `.app`** (AI models download on first launch):

```bash
npm run build:app
```

Output: `dist/Helix-macOS-arm64.zip` (~150 MB)

1. Unzip and drag **Helix.app** to Applications  
2. Double-click **Helix** (first launch: right-click → Open if Gatekeeper blocks)  
3. First run downloads chat + image models to `~/.helix/workspace` (~15–20 GB)  
4. Browser opens at http://localhost:3000  

See [docs/LOCAL_RUN.md](docs/LOCAL_RUN.md) for troubleshooting.

## Download & run (local, terminal)

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
| `npm run build:app` | Build `Helix.app` zip for macOS |

## Docs

- [Local models (llama-server)](docs/LOCAL_MODELS.md)
- [Environment variables](.env.example)
