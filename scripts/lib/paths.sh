#!/usr/bin/env bash
# Shared paths for dev clone vs packaged macOS app.
resolve_helix_paths() {
  local script_dir="${1:?}"
  HELIX_ROOT="$(cd "$script_dir/.." && pwd)"
  if [[ -n "${HELIX_WORKSPACE:-}" ]]; then
    mkdir -p "$HELIX_WORKSPACE"
    HELIX_WORKSPACE="$(cd "$HELIX_WORKSPACE" && pwd)"
  elif [[ "${HELIX_APP_BUNDLE:-}" == "1" ]]; then
    HELIX_WORKSPACE="${HOME}/.helix/workspace"
    mkdir -p "$HELIX_WORKSPACE"
  else
    HELIX_WORKSPACE="$(cd "$HELIX_ROOT/.." && pwd)"
  fi
  export HELIX_ROOT HELIX_WORKSPACE
  export HELIX_HOME="${HELIX_HOME:-$HOME/.helix}"
}
