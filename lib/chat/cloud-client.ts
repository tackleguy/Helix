"use client";

const CACHE_KEY = "helix:cloud-mode";

/** True when the UI should use browser storage + stateless /api/chat. */
export function isCloudClient(): boolean {
  if (typeof window === "undefined") return false;

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return false;
  }

  if (process.env.NEXT_PUBLIC_HELIX_CLOUD === "1") {
    return true;
  }

  if (host.includes("vercel.app")) {
    return true;
  }

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached === "1") return true;
    if (cached === "0") return false;
  } catch {
    /* ignore */
  }

  return false;
}

/** Probe /api/cloud-status and cache result for custom domains on Vercel. */
export async function detectCloudClient(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return false;
  }

  if (process.env.NEXT_PUBLIC_HELIX_CLOUD === "1" || host.includes("vercel.app")) {
    try {
      sessionStorage.setItem(CACHE_KEY, "1");
    } catch {
      /* ignore */
    }
    return true;
  }

  try {
    const res = await fetch("/api/cloud-status", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { vercel?: boolean };
      // Any Vercel deploy uses browser session storage (not server SQLite).
      const cloud = Boolean(data.vercel);
      try {
        sessionStorage.setItem(CACHE_KEY, cloud ? "1" : "0");
      } catch {
        /* ignore */
      }
      return cloud;
    }
  } catch {
    /* ignore */
  }

  return false;
}
