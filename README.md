# Helix

AI workspace for chat and images — **cloud website** or **local Mac app**.

## Two ways to use Helix

| | **Cloud** | **Local download** |
|---|-----------|-------------------|
| URL | [helix-five-wheat.vercel.app](https://helix-five-wheat.vercel.app) | `Helix.app` on your Mac |
| AI | Hugging Face (browser) | llama-server + ComfyUI (offline) |
| Install | None | [Download zip](https://helix-five-wheat.vercel.app/downloads/Helix-macOS-arm64.zip) |

Landing page: **/** — pick Cloud or Download.

## Cloud website

Open the hosted site → **Open workspace** → `/chat`. Requires `HF_API_KEY` on Vercel.

## Local Mac app

Build a **double-clickable `.app`** (AI models download on first launch):

```bash
npm run build:app
```

Output: `dist/Helix-macOS-arm64.zip` (~150 MB)

1. Unzip and drag **Helix.app** to Applications  
2. If macOS says it **could not verify** the app: **right-click Helix.app → Open → Open** (once), or run `xattr -dr com.apple.quarantine /Applications/Helix.app`  
3. First run downloads chat + image models to `~/.helix/workspace` (~15–20 GB)  
4. Browser opens at http://localhost:3000  

Helix is not Apple-notarized yet (unsigned indie build). See `/download` on the site for Gatekeeper steps.

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
