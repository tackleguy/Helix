import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api";
import { defaultCloudModelForNewSession } from "@/lib/chat/cloud-model";
import {
  createSession,
  deleteSession,
  listSessions,
  toSessionDto,
} from "@/lib/chat/repository";
import { logServer } from "@/lib/logger";
import { isVercelDeploy } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = listSessions(false);
    return Response.json({ sessions: rows.map(toSessionDto) });
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
    const defaultModel =
      parsed.data.model ??
      (isVercelDeploy() ? defaultCloudModelForNewSession() : null);
    const row = createSession({
      title: parsed.data.title,
      model: defaultModel,
      systemPrompt: parsed.data.systemPrompt,
    });
    return Response.json({ session: toSessionDto(row) }, { status: 201 });
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
    for (const s of listSessions(true)) {
      deleteSession(s.id);
    }
    const row = createSession({
      title: "New chat",
      model: isVercelDeploy() ? defaultCloudModelForNewSession() : null,
    });
    logServer("info", "all chat sessions cleared");
    return Response.json({ session: toSessionDto(row) });
  } catch (err) {
    logServer("error", "sessions DELETE failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to clear sessions", 500);
  }
}
