#!/usr/bin/env bash
# Install Playwright + Chromium for HTML → PNG image generation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v python3 >/dev/null; then
  echo "[helix] python3 is required"
  exit 1
fi

echo "[helix] installing Playwright (pip)…"
python3 -m pip install -r "$ROOT/scripts/requirements-html.txt"

echo "[helix] installing Chromium for Playwright…"
python3 -m playwright install chromium

echo "[helix] verifying…"
python3 "$ROOT/scripts/html_to_image.py" --check

echo ""
echo "=== HTML render ready ==="
echo "Use model 'HTML Canvas' in Image Studio (prompt → HTML → PNG)."
