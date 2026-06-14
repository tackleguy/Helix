#!/usr/bin/env bash
# Download a file with curl (resume + progress).
# Usage: download_file URL DEST
download_file() {
  local url="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [[ -f "$dest" ]]; then
    echo "[helix] already exists: $dest"
    return 0
  fi
  echo "[helix] downloading $(basename "$dest")"
  curl -fL --progress-bar -C - "$url" -o "$dest"
}

# Detect llama.cpp release tarball for this machine.
llama_release_tag() {
  echo "b9305"
}

llama_archive_name() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$os-$arch" in
    darwin-arm64) echo "llama-$(llama_release_tag)-bin-macos-arm64.tar.gz" ;;
    darwin-x86_64) echo "llama-$(llama_release_tag)-bin-macos-x86_64.tar.gz" ;;
    linux-x86_64) echo "llama-$(llama_release_tag)-bin-ubuntu-x64.tar.gz" ;;
    linux-aarch64) echo "llama-$(llama_release_tag)-bin-ubuntu-arm64.tar.gz" ;;
    *)
      echo ""
      return 1
      ;;
  esac
}

find_python312() {
  for py in python3.12 python3.11 python3; do
    if command -v "$py" >/dev/null 2>&1; then
      echo "$py"
      return 0
    fi
  done
  return 1
}
