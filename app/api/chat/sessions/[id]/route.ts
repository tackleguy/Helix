import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api";
import { logServer } from "@/lib/logger";
import {
  branchSession,
  deleteSession,
  getMessages,
  getSessionOrThrow,
  toSessionDto,
  updateSession,
} from "@/lib/chat/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const session = getSessionOrThrow(id);
    const messages = getMessages(id);
    return Response.json({
      session: toSessionDto(session),
      messages,
    });
  } catch (err) {
    logServer("error", "session GET failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("session not found", 404, "NOT_FOUND");
  }
}

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  archived: z.boolean().optional(),
  systemPrompt: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = await parseJsonBody(req, PatchSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const { id } = await ctx.params;
    getSessionOrThrow(id);
    updateSession(id, parsed.data);
    const session = getSessionOrThrow(id);
    return Response.json({ session: toSessionDto(session) });
  } catch (err) {
    logServer("error", "session PATCH failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to update session", 500);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    getSessionOrThrow(id);
    deleteSession(id);
    return Response.json({ ok: true });
  } catch (err) {
    logServer("error", "session DELETE failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to delete session", 500);
  }
}

const BranchSchema = z.object({
  untilMessageId: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const parsed = await parseJsonBody(req, BranchSchema);
  if ("error" in parsed) return parsed.error;

  try {
    const { id } = await ctx.params;
    const newSession = branchSession(id, parsed.data.untilMessageId);
    return Response.json({ session: toSessionDto(newSession) }, { status: 201 });
  } catch (err) {
    logServer("error", "session branch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError(
      err instanceof Error ? err.message : "branch failed",
      400,
      "BRANCH_FAILED",
    );
  }
}
