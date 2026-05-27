import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { uid } from "@/lib/utils";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .select()
      .from(sessions)
      .where(eq(sessions.archived, false))
      .orderBy(desc(sessions.updatedAt))
      .all();
    return Response.json({ sessions: rows });
  } catch (err) {
    logServer("error", "sessions GET failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to list sessions", 500);
  }
}

const CreateSchema = z.object({
  title: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, CreateSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const db = getDb();
    const id = uid();
    const now = new Date();
    const row = {
      id,
      title: parsed.data.title ?? "New chat",
      model: parsed.data.model ?? null,
      systemPrompt: parsed.data.systemPrompt ?? null,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    db.insert(sessions).values(row).run();
    return Response.json({ session: row }, { status: 201 });
  } catch (err) {
    logServer("error", "sessions POST failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to create session", 500);
  }
}

const ClearSchema = z.object({
  confirm: z.literal(true),
});

export async function DELETE(req: Request) {
  const parsed = await parseJsonBody(req, ClearSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const db = getDb();
    db.delete(sessions).run();
    const id = uid();
    const now = new Date();
    const fresh = {
      id,
      title: "New chat",
      model: null,
      systemPrompt: null,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    db.insert(sessions).values(fresh).run();
    logServer("info", "all chat sessions cleared");
    return Response.json({ session: fresh });
  } catch (err) {
    logServer("error", "sessions DELETE failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to clear sessions", 500);
  }
}
