#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.local/bin:${PATH}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; FAILED=1; }

FAILED=0

echo "=== Helix system check ==="
echo ""

echo "--- Toolchain ---"
if command -v node >/dev/null; then
  ok "node $(node -v)"
else fail "node not found"; fi

if command -v npm >/dev/null; then
  ok "npm $(npm -v)"
else fail "npm not found"; fi

if command -v hf >/dev/null; then
  ok "hf $(hf --version 2>/dev/null | head -1) at $(command -v hf)"
  if [ -d "${HOME}/.hf-cli/venv" ]; then
    ok "HF CLI official install (~/.hf-cli)"
  fi
  if uv tool list 2>/dev/null | grep -q huggingface-hub; then
    ok "HF CLI uv tool (huggingface-hub)"
  fi
else
  fail "hf not on PATH — add: export PATH=\"\${HOME}/.local/bin:\$PATH\""
fi

PY312="${HOME}/.local/share/uv/python/cpython-3.12.13-macos-aarch64-none/bin/python3"
if [ -x "$PY312" ]; then
  ok "Python 3.12 ($("$PY312" --version))"
else
  warn "Python 3.12 via uv not found (HF CLI installer needs 3.10+)"
fi

echo ""
echo "--- Hugging Face auth ---"
if hf auth whoami >/dev/null 2>&1; then
  ok "hf logged in as $(hf auth whoami 2>/dev/null)"
else
  warn "hf not logged in — run: hf auth login"
fi

echo ""
echo "--- Environment (${ROOT}/.env.local) ---"
if [ -f "${ROOT}/.env.local" ]; then
  ok ".env.local exists"
  # shellcheck disable=SC1091
  set -a && source "${ROOT}/.env.local" && set +a
else
  warn ".env.local missing — copy from .env.example"
fi

if [ -n "${HF_API_KEY:-}" ] || [ -n "${HF_TOKEN:-}" ]; then
  ok "HF_API_KEY set (cloud chat via Hugging Face)"
  if node "${ROOT}/scripts/test-hf-connection.mjs" >/dev/null 2>&1; then
    ok "Hugging Face inference API reachable"
  else
    fail "Hugging Face inference API test failed (run: npm run test:hf)"
  fi
else
  warn "HF_API_KEY not set — add after: hf auth login (or paste token)"
fi

if [ -n "${OLLAMA_API_KEY:-}" ]; then
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${OLLAMA_API_KEY}" \
    --max-time 10 "https://ollama.com/api/tags" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    ok "Ollama Cloud reachable"
  else
    fail "Ollama Cloud HTTP ${code}"
  fi
else
  warn "OLLAMA_API_KEY not set (optional for Ollama Cloud)"
fi

echo ""
echo "--- Helix project ---"
cd "$ROOT"
if npm run typecheck --silent 2>/dev/null; then
  ok "TypeScript"
else
  fail "TypeScript (npm run typecheck)"
fi

if [ -d node_modules ]; then
  ok "node_modules present"
else
  fail "run: npm install"
fi

echo ""
if [ "$FAILED" = "1" ]; then
  echo -e "${RED}Some checks failed.${NC}"
  exit 1
fi
echo -e "${GREEN}Ready to run: npm run dev${NC}"
