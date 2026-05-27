import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api";
import { loadAppSettings, saveAppSettings, AppSettingsSchema } from "@/lib/settings";
import {
  loadServiceUrls,
  saveServiceUrls,
  pingServiceById,
} from "@/lib/services/registry";
import type { ServiceId } from "@/lib/services/types";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({
      app: loadAppSettings(),
      services: await loadServiceUrls(),
    });
  } catch (err) {
    logServer("error", "settings GET failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to load settings", 500);
  }
}

const PatchSchema = z.object({
  app: AppSettingsSchema.partial().optional(),
  services: z
    .record(z.string(), z.string().url())
    .optional(),
});

export async function PATCH(req: Request) {
  const parsed = await parseJsonBody(req, PatchSchema);
  if ("error" in parsed) return parsed.error;

  try {
    if (parsed.data.app) {
      saveAppSettings(parsed.data.app);
    }
    if (parsed.data.services) {
      saveServiceUrls(parsed.data.services);
    }
    return Response.json({
      app: loadAppSettings(),
      services: await loadServiceUrls(),
    });
  } catch (err) {
    logServer("error", "settings PATCH failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to save settings", 500);
  }
}

const PingSchema = z.object({
  serviceId: z.enum([
    "lmstudio",
    "ollama",
    "llama-server",
    "comfyui",
    "whisper",
    "coqui",
    "chroma",
  ]),
  url: z.string().url().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, PingSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const health = await pingServiceById(
      parsed.data.serviceId as ServiceId,
      parsed.data.url,
    );
    return Response.json({ health });
  } catch (err) {
    logServer("error", "settings ping failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("ping failed", 500);
  }
}
