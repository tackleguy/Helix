import { ollamaRequestHeaders } from "@/lib/ollama";
import { loadAppSettings } from "@/lib/settings";
import { loadServiceUrls, getServiceHealth } from "@/lib/services/registry";
import type { ChatBackendId } from "./types";

const ORDER: ChatBackendId[] = ["llama-server", "ollama", "lmstudio"];

/** Quick check — avoids slow listModels when nothing local is running. */
export async function hasOnlineLocalChatBackend(): Promise<boolean> {
  for (const id of ORDER) {
    const health = await getServiceHealth(id);
    if (health.online) return true;
  }
  return false;
}

export interface ResolvedBackend {
  id: ChatBackendId;
  baseUrl: string;
  model: string;
}

export async function listModels(
  baseUrl: string,
  backendId?: ChatBackendId,
): Promise<string[]> {
  const url = baseUrl.replace(/\/$/, "") + "/v1/models";
  const headers =
    backendId === "ollama"
      ? ollamaRequestHeaders()
      : { Accept: "application/json" };
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id: string }> };
    return (data.data ?? []).map((m) => m.id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function resolveChatBackend(
  overrideBackend?: string | null,
  overrideModel?: string | null,
): Promise<ResolvedBackend> {
  const settings = loadAppSettings();
  const urls = await loadServiceUrls();

  const preference = (overrideBackend ??
    settings.defaultChatModel) as ChatBackendId;
  const tryOrder = [
    preference,
    ...ORDER.filter((id) => id !== preference),
  ] as ChatBackendId[];

  for (const id of tryOrder) {
    const health = await getServiceHealth(id);
    if (!health.online) continue;
    const baseUrl = urls[id];
    const models = await listModels(baseUrl, id);
    const model =
      overrideModel && models.includes(overrideModel)
        ? overrideModel
        : models[0] ?? "default";
    return { id, baseUrl, model };
  }

  throw new Error(
    "No chat backend is running. Start LM Studio, Ollama, or llama-server and check Settings → Services.",
  );
}
