#!/usr/bin/env bash
# Build Helix.app for macOS (arm64) — downloadable local AI desktop app.
#
# Output: dist/Helix-macOS-arm64.zip (~150 MB app shell; models download on first launch)
#
# Requirements: macOS arm64, node 20+, npm, curl, git
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
STAGING="$DIST/staging"
APP="$STAGING/Helix.app"
RES="$APP/Contents/Resources"
HELIX_RES="$RES/helix"
NODE_VERSION="${NODE_BUNDLE_VERSION:-20.19.0}"
ARCH="$(uname -m)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[helix] macOS build only (for now)"
  exit 1
fi

case "$ARCH" in
  arm64) NODE_ARCH="arm64" ;;
  x86_64) NODE_ARCH="x64" ;;
  *) echo "[helix] unsupported arch: $ARCH"; exit 1 ;;
esac

echo "=== Building Helix.app ($ARCH) ==="

cd "$ROOT"
echo "[helix] next build (standalone)…"
npm run build

rm -rf "$STAGING"
mkdir -p "$HELIX_RES" "$RES/node" "$APP/Contents/MacOS"

echo "[helix] copying standalone server…"
cp -R .next/standalone/. "$HELIX_RES/"
mkdir -p "$HELIX_RES/.next"
cp -R .next/static "$HELIX_RES/.next/static"
mkdir -p "$HELIX_RES/lib/db"
cp -R lib/db/migrations "$HELIX_RES/lib/db/"

echo "[helix] copying scripts…"
mkdir -p "$HELIX_RES/scripts/lib"
cp scripts/app-run.sh scripts/install-local.sh scripts/start-local.sh \
  scripts/stop-local.sh scripts/serve-llama.sh scripts/serve-comfyui.sh \
  "$HELIX_RES/scripts/"
cp scripts/lib/*.sh "$HELIX_RES/scripts/lib/"

echo "[helix] bundling Node $NODE_VERSION…"
NODE_TGZ="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TGZ}"
TMP_NODE="$DIST/$NODE_TGZ"
if [[ ! -f "$TMP_NODE" ]]; then
  curl -fL --progress-bar "$NODE_URL" -o "$TMP_NODE"
fi
tar -xzf "$TMP_NODE" -C "$DIST"
cp -R "$DIST/node-v${NODE_VERSION}-darwin-${NODE_ARCH}/bin" "$RES/node/"
cp -R "$DIST/node-v${NODE_VERSION}-darwin-${NODE_ARCH}/lib" "$RES/node/" 2>/dev/null || true

cat >"$APP/Contents/MacOS/Helix" <<'LAUNCHER'
#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
RES="$(cd "$DIR/../Resources" && pwd)"
export HELIX_APP_BUNDLE=1
export HELIX_WORKSPACE="${HOME}/.helix/workspace"
export HELIX_NODE="$RES/node/bin/node"
export PATH="$RES/node/bin:$PATH"
cd "$RES/helix"
exec bash "$RES/helix/scripts/app-run.sh"
LAUNCHER
chmod +x "$APP/Contents/MacOS/Helix"

cp "$ROOT/packaging/macos/Info.plist" "$APP/Contents/Info.plist"

ZIP_NAME="Helix-macOS-${ARCH}.zip"
cd "$STAGING"
rm -f "$DIST/$ZIP_NAME"
ditto -c -k --sequesterRsrc --keepParent Helix.app "$DIST/$ZIP_NAME"

echo ""
echo "=== Done ==="
echo "  App:  $APP"
echo "  Zip:  $DIST/$ZIP_NAME"
echo ""
echo "Install: unzip and drag Helix.app to Applications"
echo "First launch downloads AI models to ~/.helix/workspace (~15–20 GB)"
