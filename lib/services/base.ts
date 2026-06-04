import { ollamaRequestHeaders } from "@/lib/ollama";
import type { ServiceConfig, ServiceHealth, ServiceId } from "./types";

const DEFAULTS: ServiceConfig[] = [
  {
    id: "lmstudio",
    label: "LM Studio",
    defaultUrl: "http://127.0.0.1:1234",
    healthPath: "/v1/models",
  },
  {
    id: "ollama",
    label: "Ollama",
    defaultUrl: "http://127.0.0.1:11434",
    healthPath: "/v1/models",
  },
  {
    id: "llama-server",
    label: "llama-server",
    defaultUrl: "http://127.0.0.1:8080",
    healthPath: "/v1/models",
  },
  {
    id: "comfyui",
    label: "ComfyUI",
    defaultUrl: "http://127.0.0.1:8188",
    healthPath: "/system_stats",
  },
  {
    id: "whisper",
    label: "Whisper.cpp",
    defaultUrl: "http://127.0.0.1:8081",
    healthPath: "/health",
  },
  {
    id: "coqui",
    label: "Coqui TTS",
    defaultUrl: "http://127.0.0.1:5002",
    healthPath: "/",
  },
  {
    id: "chroma",
    label: "ChromaDB",
    defaultUrl: "http://127.0.0.1:8000",
    healthPath: "/api/v1/heartbeat",
  },
];

export function getServiceConfigs(): ServiceConfig[] {
  return DEFAULTS;
}

export function getServiceConfig(id: ServiceId): ServiceConfig {
  const cfg = DEFAULTS.find((s) => s.id === id);
  if (!cfg) throw new Error(`unknown service: ${id}`);
  return cfg;
}

export async function pingService(
  baseUrl: string,
  healthPath: string,
  timeoutMs = 3000,
  headers: Record<string, string> = { Accept: "application/json" },
): Promise<{ online: boolean; latencyMs: number | null; detail: string | null }> {
  const url = baseUrl.replace(/\/$/, "") + healthPath;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers,
    });
    const latencyMs = Date.now() - started;
    if (res.ok) {
      return { online: true, latencyMs, detail: null };
    }
    return {
      online: false,
      latencyMs,
      detail: `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      online: false,
      latencyMs: null,
      detail: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export async function checkServiceHealth(
  id: ServiceId,
  baseUrl: string,
): Promise<ServiceHealth> {
  const cfg = getServiceConfig(id);
  const headers =
    id === "ollama"
      ? ollamaRequestHeaders()
      : { Accept: "application/json" };
  const result = await pingService(baseUrl, cfg.healthPath, 3000, headers);
  return {
    id,
    label: cfg.label,
    url: baseUrl,
    online: result.online,
    latencyMs: result.latencyMs,
    detail: result.detail,
    checkedAt: Date.now(),
  };
}
