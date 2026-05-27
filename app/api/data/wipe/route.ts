import { apiError, parseJsonBody } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { logServer } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WipeSchema = z.object({
  confirm: z.literal("WIPE_ALL_DATA"),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, WipeSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const db = getDb();
    db.delete(schema.agentRuns).run();
    db.delete(schema.agents).run();
    db.delete(schema.chunks).run();
    db.delete(schema.documents).run();
    db.delete(schema.messages).run();
    db.delete(schema.sessions).run();
    db.delete(schema.images).run();
    db.delete(schema.videos).run();
    db.delete(schema.skills).run();
    db.delete(schema.settings).run();

    logServer("warn", "database wiped by user");
    return Response.json({ ok: true });
  } catch (err) {
    logServer("error", "data wipe failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("wipe failed", 500);
  }
}
