import { apiError } from "@/lib/api";
import { loadServiceUrls, getAllServiceHealth } from "@/lib/services/registry";
import type { ServiceId } from "@/lib/services/types";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAT_BACKENDS: ServiceId[] = ["llama-server", "lmstudio", "ollama"];

interface BackendModels {
  backend: ServiceId;
  online: boolean;
  models: Array<{ id: string }>;
  error?: string;
}

async function fetchModels(
  backend: ServiceId,
  baseUrl: string,
): Promise<BackendModels> {
  try {
    const url = baseUrl.replace(/\/$/, "") + "/v1/models";
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        backend,
        online: false,
        models: [],
        error: `HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const models = (json.data ?? [])
      .map((m) => (typeof m.id === "string" ? { id: m.id } : null))
      .filter((m): m is { id: string } => m !== null);
    return { backend, online: true, models };
  } catch (err) {
    return {
      backend,
      online: false,
      models: [],
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export async function GET() {
  try {
    const urls = await loadServiceUrls();
    const healths = await getAllServiceHealth();
    const healthById = new Map(healths.map((h) => [h.id, h]));

    const results = await Promise.all(
      CHAT_BACKENDS.map((id) => {
        const online = healthById.get(id)?.online ?? false;
        if (!online) {
          return Promise.resolve<BackendModels>({
            backend: id,
            online: false,
            models: [],
            error: healthById.get(id)?.detail ?? "offline",
          });
        }
        return fetchModels(id, urls[id]);
      }),
    );

    return Response.json({ backends: results });
  } catch (err) {
    logServer("error", "models GET failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to list models", 500);
  }
}
