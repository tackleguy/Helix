import { existsSync } from "node:fs";
import { join } from "node:path";

export const HELIX_APP_ZIP_NAME = "Helix-macOS-arm64.zip";

const DEFAULT_RELEASES_URL =
  "https://github.com/tackleguy/Helix/releases/latest";

export function getAppDownloadRedirectUrl(): string | null {
  const fromEnv =
    process.env.HELIX_APP_DOWNLOAD_URL?.trim() ||
    process.env.NEXT_PUBLIC_HELIX_APP_DOWNLOAD_URL?.trim();
  if (fromEnv) return fromEnv;
  return `${DEFAULT_RELEASES_URL}/download/${HELIX_APP_ZIP_NAME}`;
}

export function getLocalAppZipPath(): string | null {
  const path = join(process.cwd(), "dist", HELIX_APP_ZIP_NAME);
  return existsSync(path) ? path : null;
}

export function getAppDownloadMeta() {
  const localPath = getLocalAppZipPath();
  const redirectUrl = getAppDownloadRedirectUrl();
  return {
    available: true,
    local: Boolean(localPath),
    filename: HELIX_APP_ZIP_NAME,
    platform: "macOS (Apple Silicon)",
    sizeHint: "~48 MB app · ~15–20 GB models on first launch",
    downloadUrl: localPath ? "/api/download/app" : redirectUrl,
    releasesUrl: DEFAULT_RELEASES_URL,
  };
}
