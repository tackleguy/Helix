import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { messages, sessions } from "@/lib/db/schema";
import { uid } from "@/lib/utils";
import type { ChatMessageDto, SessionDto, StoredAttachment } from "./types";

function toSessionDto(row: typeof sessions.$inferSelect): SessionDto {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    systemPrompt: row.systemPrompt,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    archived: row.archived,
  };
}

function parseAttachments(json: string | null): StoredAttachment[] | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as StoredAttachment[];
  } catch {
    return undefined;
  }
}

function toMessageDto(row: typeof messages.$inferSelect): ChatMessageDto {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    attachments: parseAttachments(row.attachmentsJson),
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    createdAt: row.createdAt.getTime(),
  };
}

export function getSession(id: string) {
  const db = getDb();
  return db.select().from(sessions).where(eq(sessions.id, id)).get();
}

export function getSessionOrThrow(id: string) {
  const row = getSession(id);
  if (!row) throw new Error("session not found");
  return row;
}

export function listSessions(includeArchived = false) {
  const db = getDb();
  if (includeArchived) {
    return db.select().from(sessions).orderBy(desc(sessions.updatedAt)).all();
  }
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.archived, false))
    .orderBy(desc(sessions.updatedAt))
    .all();
}

export function getMessages(sessionId: string): ChatMessageDto[] {
  const db = getDb();
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt))
    .all()
    .map(toMessageDto);
}

export function createSession(input?: {
  title?: string;
  model?: string | null;
  systemPrompt?: string | null;
}) {
  const db = getDb();
  const id = uid();
  const now = new Date();
  const row = {
    id,
    title: input?.title ?? "New chat",
    model: input?.model ?? null,
    systemPrompt: input?.systemPrompt ?? null,
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
  db.insert(sessions).values(row).run();
  return row;
}

export function updateSession(
  id: string,
  patch: Partial<{
    title: string;
    model: string | null;
    systemPrompt: string | null;
    archived: boolean;
  }>,
) {
  const db = getDb();
  db.update(sessions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(sessions.id, id))
    .run();
}

export function deleteSession(id: string) {
  const db = getDb();
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function insertMessage(input: {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachmentsJson?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
}) {
  const db = getDb();
  const id = uid();
  const now = new Date();
  db.insert(messages)
    .values({
      id,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      attachmentsJson: input.attachmentsJson ?? null,
      tokensIn: input.tokensIn ?? null,
      tokensOut: input.tokensOut ?? null,
      createdAt: now,
    })
    .run();
  db.update(sessions)
    .set({ updatedAt: now })
    .where(eq(sessions.id, input.sessionId))
    .run();
  return id;
}

export function updateMessage(
  id: string,
  patch: Partial<{
    content: string;
    tokensOut: number | null;
  }>,
) {
  const db = getDb();
  db.update(messages).set(patch).where(eq(messages.id, id)).run();
}

export function deleteMessage(id: string) {
  const db = getDb();
  db.delete(messages).where(eq(messages.id, id)).run();
}

export function deleteMessagesAfter(sessionId: string, afterCreatedAt: Date) {
  const db = getDb();
  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt))
    .all();
  for (const m of rows) {
    if (m.createdAt.getTime() > afterCreatedAt.getTime()) {
      db.delete(messages).where(eq(messages.id, m.id)).run();
    }
  }
}

export function branchSession(sessionId: string, untilMessageId: string) {
  const db = getDb();
  const source = getSessionOrThrow(sessionId);
  const all = db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt))
    .all();

  const cutIndex = all.findIndex((m) => m.id === untilMessageId);
  if (cutIndex < 0) throw new Error("message not found");

  const slice = all.slice(0, cutIndex + 1);
  const newSession = createSession({
    title: `${source.title} (branch)`,
    model: source.model,
    systemPrompt: source.systemPrompt,
  });

  for (const m of slice) {
    db.insert(messages)
      .values({
        id: uid(),
        sessionId: newSession.id,
        role: m.role,
        content: m.content,
        attachmentsJson: m.attachmentsJson,
        tokensIn: m.tokensIn,
        tokensOut: m.tokensOut,
        createdAt: m.createdAt,
      })
      .run();
  }

  return newSession;
}

export { toSessionDto, toMessageDto };
