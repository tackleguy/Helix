#!/usr/bin/env bash
# Remove macOS quarantine so Helix.app can open after download (unsigned build).
set -euo pipefail

APP="${1:-/Applications/Helix.app}"

if [[ ! -d "$APP" ]]; then
  echo "Helix.app not found at: $APP"
  echo "Usage: $0 [/path/to/Helix.app]"
  exit 1
fi

xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
echo "Done. Open Helix from Applications (or double-click Helix.app)."
