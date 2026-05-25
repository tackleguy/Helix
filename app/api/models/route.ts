import {
  DEFAULT_MODEL_ID,
  MODELS,
  getApiKey,
  toInfo,
  type ModelDef,
  type ModelInfo,
} from "@/lib/models";

export const runtime = "edge";

interface LoadedLocal {
  loadedAlias: string | null;
  reachable: boolean;
}

async function probeLocal(baseUrl: string): Promise<LoadedLocal> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 700);
  try {
    const res = await fetch(`${baseUrl}/models`, { signal: ctrl.signal });
    if (!res.ok) return { loadedAlias: null, reachable: false };
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const id = json.data?.[0]?.id ?? null;
    return { loadedAlias: id, reachable: true };
  } catch {
    return { loadedAlias: null, reachable: false };
  } finally {
    clearTimeout(t);
  }
}

function isAvailable(model: ModelDef, localLoaded: string | null): boolean {
  if (model.backend.location === "local") {
    return localLoaded === model.backend.upstreamModel;
  }
  if (model.backend.apiKeyEnv) {
    return Boolean(getApiKey(model));
  }
  return true;
}

export async function GET() {
  const localBaseUrl = MODELS.find((m) => m.backend.location === "local")
    ?.backend.baseUrl;
  const local = localBaseUrl
    ? await probeLocal(localBaseUrl)
    : { loadedAlias: null, reachable: false };

  const models: ModelInfo[] = MODELS.map((m) =>
    toInfo(m, isAvailable(m, local.loadedAlias)),
  );

  return Response.json({
    models,
    defaultId: DEFAULT_MODEL_ID,
    localServer: {
      reachable: local.reachable,
      loadedAlias: local.loadedAlias,
    },
  });
}
