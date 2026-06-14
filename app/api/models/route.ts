import { apiError } from "@/lib/api";
import { ollamaRequestHeaders } from "@/lib/ollama";
import {
  hasHuggingFaceChat,
  hasOpenAIChat,
  isLocalOnlyMode,
  isVercelDeploy,
} from "@/lib/env";
import { loadServiceUrls, getAllServiceHealth } from "@/lib/services/registry";
import type { ServiceId } from "@/lib/services/types";
import { logServer } from "@/lib/logger";
import { getHuggingFaceModel } from "@/src/services/ai/huggingface";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAT_BACKENDS: ServiceId[] = ["llama-server", "lmstudio", "ollama"];

interface BackendModels {
  backend: string;
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
    const headers =
      backend === "ollama"
        ? ollamaRequestHeaders()
        : { Accept: "application/json" };
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers,
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

function cloudBackends(): BackendModels[] {
  const cloud: BackendModels[] = [];

  if (hasHuggingFaceChat()) {
    const model = getHuggingFaceModel();
    cloud.push({
      backend: "huggingface",
      online: true,
      models: [{ id: model }],
    });
  }

  if (hasOpenAIChat()) {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    cloud.push({
      backend: "openai",
      online: true,
      models: [{ id: model }],
    });
  }

  return cloud;
}

export async function GET() {
  try {
    const cloud = isLocalOnlyMode() ? [] : cloudBackends();

    if (isVercelDeploy()) {
      return Response.json({
        backends:
          cloud.length > 0
            ? cloud
            : [
                {
                  backend: "huggingface",
                  online: false,
                  models: [],
                  error: "Set HF_API_KEY in Vercel environment variables",
                },
              ],
      });
    }

    const urls = await loadServiceUrls();
    const healths = await getAllServiceHealth();
    const healthById = new Map(healths.map((h) => [h.id, h]));

    const local = await Promise.all(
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

    return Response.json({ backends: [...cloud, ...local] });
  } catch (err) {
    logServer("error", "models GET failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to list models", 500);
  }
}
