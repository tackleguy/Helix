import { sql } from "drizzle-orm";
import { apiError } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { loadAppSettings } from "@/lib/settings";
import { loadServiceUrls } from "@/lib/services/registry";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const sessions = db.select().from(schema.sessions).all();
    const messages = db.select().from(schema.messages).all();
    const images = db.select().from(schema.images).all();
    const videos = db.select().from(schema.videos).all();
    const documents = db.select().from(schema.documents).all();
    const agents = db.select().from(schema.agents).all();
    const agentRuns = db.select().from(schema.agentRuns).all();
    const skills = db.select().from(schema.skills).all();

    return Response.json({
      exportedAt: new Date().toISOString(),
      app: loadAppSettings(),
      services: await loadServiceUrls(),
      data: {
        sessions,
        messages,
        images,
        videos,
        documents,
        agents,
        agentRuns,
        skills,
      },
    });
  } catch (err) {
    logServer("error", "data export failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("export failed", 500);
  }
}
