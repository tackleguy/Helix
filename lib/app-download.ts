import { existsSync } from "node:fs";
import { join } from "node:path";
import { isVercelDeploy } from "@/lib/env";

export const HELIX_APP_ZIP_NAME = "Helix-macOS-arm64.zip";

const DEFAULT_RELEASES_URL =
  "https://github.com/tackleguy/Helix/releases/latest";

const STATIC_DOWNLOAD_PATH = `/downloads/${HELIX_APP_ZIP_NAME}`;

export function getAppDownloadRedirectUrl(): string | null {
  const fromEnv =
    process.env.HELIX_APP_DOWNLOAD_URL?.trim() ||
    process.env.NEXT_PUBLIC_HELIX_APP_DOWNLOAD_URL?.trim();
  if (fromEnv) return fromEnv;
  return `${DEFAULT_RELEASES_URL}/download/${HELIX_APP_ZIP_NAME}`;
}

export function getDistAppZipPath(): string | null {
  const path = join(process.cwd(), "dist", HELIX_APP_ZIP_NAME);
  return existsSync(path) ? path : null;
}

export function getPublicAppZipPath(): string | null {
  const path = join(process.cwd(), "public", "downloads", HELIX_APP_ZIP_NAME);
  return existsSync(path) ? path : null;
}

/** Best file path to stream from disk, if any. */
export function getServeableAppZipPath(): string | null {
  return getPublicAppZipPath() ?? getDistAppZipPath();
}

export function getAppDownloadHref(): string {
  if (getServeableAppZipPath()) {
    return STATIC_DOWNLOAD_PATH;
  }
  return "/api/download/app";
}

export function getAppDownloadMeta() {
  const serveable = getServeableAppZipPath();
  const redirectUrl = getAppDownloadRedirectUrl();
  const onVercel = isVercelDeploy();

  return {
    available: Boolean(serveable || redirectUrl),
    ready: Boolean(serveable),
    local: Boolean(serveable),
    onVercel,
    filename: HELIX_APP_ZIP_NAME,
    platform: "macOS (Apple Silicon)",
    sizeHint: "~48 MB app · ~15–20 GB models on first launch",
    downloadUrl: serveable ? STATIC_DOWNLOAD_PATH : "/api/download/app",
    releasesUrl: DEFAULT_RELEASES_URL,
    message: serveable
      ? null
      : onVercel
        ? "Building release — try again in a few minutes or visit GitHub Releases."
        : "Run npm run build:app to generate the macOS download.",
  };
}
