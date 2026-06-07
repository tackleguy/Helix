import { uid } from "@/lib/utils";
import type { ChatMessageDto, SessionDto, StoredAttachment } from "@/lib/chat/types";

type SessionRow = {
  id: string;
  title: string;
  model: string | null;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
};

type MessageRow = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachmentsJson: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: Date;
};

interface MemoryState {
  sessions: Map<string, SessionRow>;
  messages: Map<string, MessageRow>;
}

function store(): MemoryState {
  const g = globalThis as typeof globalThis & { __helixMemory?: MemoryState };
  if (!g.__helixMemory) {
    g.__helixMemory = {
      sessions: new Map(),
      messages: new Map(),
    };
  }
  return g.__helixMemory;
}

function parseAttachments(json: string | null): StoredAttachment[] | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as StoredAttachment[];
  } catch {
    return undefined;
  }
}

function toSessionDto(row: SessionRow): SessionDto {
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

function toMessageDto(row: MessageRow): ChatMessageDto {
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

export const memoryStore = {
  getSession(id: string) {
    return store().sessions.get(id);
  },

  getSessionOrThrow(id: string) {
    const row = store().sessions.get(id);
    if (!row) throw new Error("session not found");
    return row;
  },

  listSessions(includeArchived = false) {
    const rows = [...store().sessions.values()];
    const filtered = includeArchived
      ? rows
      : rows.filter((s) => !s.archived);
    return filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  getMessages(sessionId: string): ChatMessageDto[] {
    return [...store().messages.values()]
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toMessageDto);
  },

  createSession(input?: {
    title?: string;
    model?: string | null;
    systemPrompt?: string | null;
  }) {
    const id = uid();
    const now = new Date();
    const row: SessionRow = {
      id,
      title: input?.title ?? "New chat",
      model: input?.model ?? null,
      systemPrompt: input?.systemPrompt ?? null,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    store().sessions.set(id, row);
    return row;
  },

  updateSession(
    id: string,
    patch: Partial<{
      title: string;
      model: string | null;
      systemPrompt: string | null;
      archived: boolean;
    }>,
  ) {
    const row = store().sessions.get(id);
    if (!row) throw new Error("session not found");
    const updated = { ...row, ...patch, updatedAt: new Date() };
    store().sessions.set(id, updated);
  },

  deleteSession(id: string) {
    store().sessions.delete(id);
    for (const [mid, m] of store().messages) {
      if (m.sessionId === id) store().messages.delete(mid);
    }
  },

  insertMessage(input: {
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    attachmentsJson?: string | null;
    tokensIn?: number | null;
    tokensOut?: number | null;
  }) {
    const id = uid();
    const now = new Date();
    store().messages.set(id, {
      id,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      attachmentsJson: input.attachmentsJson ?? null,
      tokensIn: input.tokensIn ?? null,
      tokensOut: input.tokensOut ?? null,
      createdAt: now,
    });
    const session = store().sessions.get(input.sessionId);
    if (session) {
      store().sessions.set(input.sessionId, { ...session, updatedAt: now });
    }
    return id;
  },

  updateMessage(
    id: string,
    patch: Partial<{ content: string; tokensOut: number | null }>,
  ) {
    const row = store().messages.get(id);
    if (!row) return;
    store().messages.set(id, { ...row, ...patch });
  },

  deleteMessage(id: string) {
    store().messages.delete(id);
  },

  branchSession(sessionId: string, untilMessageId: string) {
    const source = store().sessions.get(sessionId);
    if (!source) throw new Error("session not found");
    const all = [...store().messages.values()]
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const cutIndex = all.findIndex((m) => m.id === untilMessageId);
    if (cutIndex < 0) throw new Error("message not found");

    const newSession = memoryStore.createSession({
      title: `${source.title} (branch)`,
      model: source.model,
      systemPrompt: source.systemPrompt,
    });

    for (const m of all.slice(0, cutIndex + 1)) {
      const id = uid();
      store().messages.set(id, {
        ...m,
        id,
        sessionId: newSession.id,
      });
    }
    return newSession;
  },

  toSessionDto,
};
