import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  checkServiceHealth,
  getServiceConfig,
  getServiceConfigs,
  pingService,
} from "./base";
import { getDefaultOllamaUrl } from "@/lib/ollama";
import type { ServiceHealth, ServiceId } from "./types";

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  health: ServiceHealth;
  expiresAt: number;
}

const cache = new Map<ServiceId, CacheEntry>();

export interface ServiceUrls {
  lmstudio: string;
  ollama: string;
  "llama-server": string;
  comfyui: string;
  whisper: string;
  coqui: string;
  chroma: string;
}

const DEFAULT_URLS: ServiceUrls = {
  lmstudio: "http://127.0.0.1:1234",
  ollama: getDefaultOllamaUrl(),
  "llama-server": "http://127.0.0.1:8080",
  comfyui: "http://127.0.0.1:8188",
  whisper: "http://127.0.0.1:8081",
  coqui: "http://127.0.0.1:5002",
  chroma: "http://127.0.0.1:8000",
};

const URL_SETTINGS_KEY = "service_urls";

export function getDefaultServiceUrls(): ServiceUrls {
  return { ...DEFAULT_URLS };
}

export async function loadServiceUrls(): Promise<ServiceUrls> {
  try {
    const db = getDb();
    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, URL_SETTINGS_KEY))
      .get();
    if (!row) return getDefaultServiceUrls();
    const parsed = JSON.parse(row.valueJson) as Partial<ServiceUrls>;
    return { ...DEFAULT_URLS, ...parsed };
  } catch {
    return getDefaultServiceUrls();
  }
}

export function saveServiceUrls(urls: Partial<ServiceUrls>): ServiceUrls {
  const db = getDb();
  const merged = { ...DEFAULT_URLS, ...urls };
  db.insert(settings)
    .values({
      key: URL_SETTINGS_KEY,
      valueJson: JSON.stringify(merged),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { valueJson: JSON.stringify(merged) },
    })
    .run();
  cache.clear();
  return merged;
}

export async function getServiceHealth(
  id: ServiceId,
  force = false,
): Promise<ServiceHealth> {
  const now = Date.now();
  const hit = cache.get(id);
  if (!force && hit && hit.expiresAt > now) {
    return hit.health;
  }

  const urls = await loadServiceUrls();
  const url = urls[id];
  const health = await checkServiceHealth(id, url);
  cache.set(id, { health, expiresAt: now + CACHE_TTL_MS });
  return health;
}

export async function getAllServiceHealth(
  force = false,
): Promise<ServiceHealth[]> {
  const configs = getServiceConfigs();
  return Promise.all(configs.map((c) => getServiceHealth(c.id, force)));
}

export async function pingServiceById(
  id: ServiceId,
  url?: string,
): Promise<ServiceHealth> {
  const urls = await loadServiceUrls();
  const baseUrl = url ?? urls[id];
  const health = await checkServiceHealth(id, baseUrl);
  cache.set(id, { health, expiresAt: Date.now() + CACHE_TTL_MS });
  return health;
}

export { getServiceConfig, getServiceConfigs, pingService };

export const serviceRegistry = {
  getDefaultServiceUrls,
  loadServiceUrls,
  saveServiceUrls,
  getServiceHealth,
  getAllServiceHealth,
  pingServiceById,
  getServiceConfigs,
};
