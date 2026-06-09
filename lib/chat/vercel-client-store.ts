"use client";

import type { ChatMessageDto, SessionDto } from "./types";
import { uid } from "@/lib/utils";
import { DEFAULT_HF_MODEL } from "@/src/services/ai/types";

const SESSIONS_KEY = "helix:vercel:sessions";
const messagesKey = (id: string) => `helix:vercel:messages:${id}`;

let memorySessions: SessionDto[] = [];
const memoryMessages = new Map<string, ChatMessageDto[]>();

function canUseLocalStorage(): boolean {
  try {
    const k = "__helix_ls_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const useStorage = typeof window !== "undefined" && canUseLocalStorage();

function readSessions(): SessionDto[] {
  if (typeof window === "undefined") return [];
  if (!useStorage) return memorySessions;
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SessionDto[]) : [];
  } catch {
    return memorySessions;
  }
}

function writeSessions(sessions: SessionDto[]) {
  memorySessions = sessions;
  if (!useStorage) return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* memory only */
  }
}

export function listVercelSessions(): SessionDto[] {
  return readSessions()
    .filter((s) => !s.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getVercelSession(id: string): SessionDto | null {
  return readSessions().find((s) => s.id === id) ?? null;
}

export function ensureVercelSession(id: string): SessionDto {
  const existing = getVercelSession(id);
  if (existing) return existing;

  const now = Date.now();
  const session: SessionDto = {
    id,
    title: "New chat",
    model: DEFAULT_HF_MODEL,
    systemPrompt: null,
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
  writeSessions([session, ...readSessions()]);
  saveVercelMessages(session.id, []);
  return session;
}

export function getVercelMessages(sessionId: string): ChatMessageDto[] {
  if (typeof window === "undefined") return [];
  if (!useStorage) return memoryMessages.get(sessionId) ?? [];
  try {
    const raw = localStorage.getItem(messagesKey(sessionId));
    return raw ? (JSON.parse(raw) as ChatMessageDto[]) : [];
  } catch {
    return memoryMessages.get(sessionId) ?? [];
  }
}

export function saveVercelMessages(
  sessionId: string,
  messages: ChatMessageDto[],
) {
  memoryMessages.set(sessionId, messages);
  if (!useStorage) return;
  try {
    localStorage.setItem(messagesKey(sessionId), JSON.stringify(messages));
  } catch {
    /* memory only */
  }
}

export function createVercelSession(): SessionDto {
  return ensureVercelSession(uid());
}

export function updateVercelSession(
  id: string,
  patch: Partial<Pick<SessionDto, "title" | "model" | "systemPrompt" | "archived">>,
) {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return;
  sessions[idx] = {
    ...sessions[idx],
    ...patch,
    updatedAt: Date.now(),
  };
  writeSessions(sessions);
}

export function deleteVercelSession(id: string) {
  writeSessions(readSessions().filter((s) => s.id !== id));
  memoryMessages.delete(id);
  if (useStorage) {
    try {
      localStorage.removeItem(messagesKey(id));
    } catch {
      /* ignore */
    }
  }
}

export function clearVercelSessions() {
  const ids = readSessions().map((s) => s.id);
  writeSessions([]);
  for (const id of ids) {
    memoryMessages.delete(id);
    if (useStorage) {
      try {
        localStorage.removeItem(messagesKey(id));
      } catch {
        /* ignore */
      }
    }
  }
}

export function touchVercelSessionTitle(sessionId: string, title: string) {
  updateVercelSession(sessionId, { title });
}
