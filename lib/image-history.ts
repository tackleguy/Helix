"use client";

export interface GenerationRecord {
  id: string;
  url: string;
  prompt: string;
  width: number;
  height: number;
  backend: string;
  duration_ms: number;
  createdAt: number;
}

const STORAGE_KEY = "helix-image-history-v1";
const MAX_ENTRIES = 48;

const isBrowser = typeof window !== "undefined";

export function loadHistory(): GenerationRecord[] {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function saveHistory(items: GenerationRecord[]): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_ENTRIES)),
    );
  } catch {
    /* quota or storage disabled — ignore */
  }
}

export function clearHistory(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function isRecord(v: unknown): v is GenerationRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.url === "string" &&
    typeof r.prompt === "string" &&
    typeof r.width === "number" &&
    typeof r.height === "number" &&
    typeof r.backend === "string" &&
    typeof r.duration_ms === "number" &&
    typeof r.createdAt === "number"
  );
}
