import { listModels, resolveChatBackend } from "@/lib/chat/backends";
import { logServer } from "@/lib/logger";
import { loadAppSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = loadAppSettings();
    const backend = await resolveChatBackend(settings.defaultChatModel);
    const models = await listModels(backend.baseUrl);
    return Response.json({
      backend: backend.id,
      activeModel: backend.model,
      models,
      location: "local" as const,
    });
  } catch (err) {
    logServer("warn", "models list unavailable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({
      backend: null,
      activeModel: null,
      models: [] as string[],
      location: "local" as const,
      error: err instanceof Error ? err.message : "offline",
    });
  }
}
