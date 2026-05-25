# Running local models

Helix's chat picker has a **Local** section listing four open models. They all
talk to a single `llama-server` process on `127.0.0.1:8080`, and the picker
shows which one is currently loaded. Swapping models = restarting the server
with a different file.

## One-time setup

```bash
# 1. workspace layout (sibling to this repo)
mkdir -p ../llama-bin ../llama.cpp/models

# 2. download the prebuilt llama.cpp binary (macOS arm64 shown; pick yours)
# from https://github.com/ggml-org/llama.cpp/releases
curl -L -o /tmp/llama.tgz \
  "https://github.com/ggml-org/llama.cpp/releases/download/b9305/llama-b9305-bin-macos-arm64.tar.gz"
tar -xzf /tmp/llama.tgz -C ../llama-bin --strip-components=1
xattr -dr com.apple.quarantine ../llama-bin   # macOS only

# 3. download whichever GGUF weights you want (Q4_K_M is a solid default)
cd ../llama.cpp/models
curl -L -O https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf
curl -L -O https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf
curl -L -O https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf
curl -L -O https://huggingface.co/bartowski/Qwen2.5-14B-Instruct-GGUF/resolve/main/Qwen2.5-14B-Instruct-Q4_K_M.gguf
```

You don't need all four — only the ones you'll actually use.

## Running

```bash
# Terminal 1 — model server
./scripts/serve-llama.sh qwen-7b     # or llama-3b / qwen-14b / deepseek-r1

# Terminal 2 — Helix
npm run dev
```

Open <http://localhost:3000>, click the model name top-right, pick the one
that's running. To switch models: `./scripts/serve-llama.sh <name>` again —
the picker auto-detects within 8s.

## Custom paths

If your binary or models live elsewhere, override via env:

```bash
LLAMA_BIN=~/bin/llama-server \
LLAMA_MODELS=~/Models \
./scripts/serve-llama.sh qwen-7b
```

## RAM and speed (Q4_K_M)

| Model | RAM | M2 Pro tok/s |
|---|---|---|
| `llama-3b` | ~3 GB | 60+ |
| `qwen-7b` | ~6 GB | 30 |
| `deepseek-r1` | ~6 GB | 30 (reasons first) |
| `qwen-14b` | ~10 GB | 15 |
