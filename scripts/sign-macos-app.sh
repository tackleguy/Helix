#!/usr/bin/env bash
# Sign Helix.app for macOS. Ad-hoc by default; set APPLE_SIGNING_IDENTITY for Developer ID.
set -euo pipefail

APP="${1:?usage: sign-macos-app.sh /path/to/Helix.app}"

IDENTITY="${APPLE_SIGNING_IDENTITY:--}"
echo "[helix] codesign identity: ${IDENTITY}"

sign() {
  codesign --force --sign "$IDENTITY" "$1" 2>/dev/null || true
}

while IFS= read -r -d '' f; do
  if file "$f" 2>/dev/null | grep -q "Mach-O"; then
    sign "$f"
  fi
done < <(find "$APP" -type f -print0)

codesign --force --deep --sign "$IDENTITY" "$APP"
codesign --verify --deep --strict "$APP" 2>/dev/null || codesign --verify --deep "$APP"

if [[ "$IDENTITY" != "-" ]] &&
  [[ -n "${APPLE_ID:-}" ]] &&
  [[ -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]] &&
  [[ -n "${APPLE_TEAM_ID:-}" ]]; then
  echo "[helix] notarizing…"
  ZIP="$(mktemp -t helix-notarize).zip"
  ditto -c -k --keepParent "$APP" "$ZIP"
  xcrun notarytool submit "$ZIP" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_APP_SPECIFIC_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait
  rm -f "$ZIP"
  xcrun stapler staple "$APP"
  echo "[helix] notarized and stapled"
fi
