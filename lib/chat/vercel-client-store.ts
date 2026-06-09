"use client";

import type { ChatMessageDto, SessionDto } from "./types";
import { uid } from "@/lib/utils";
import { DEFAULT_HF_MODEL } from "@/src/services/ai/types";

const SESSIONS_KEY = "helix:vercel:sessions";
const messagesKey = (id: string) => `helix:vercel:messages:${id}`;

function readSessions(): SessionDto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SessionDto[]) : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: SessionDto[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function listVercelSessions(): SessionDto[] {
  return readSessions()
    .filter((s) => !s.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getVercelSession(id: string): SessionDto | null {
  return readSessions().find((s) => s.id === id) ?? null;
}

export function getVercelMessages(sessionId: string): ChatMessageDto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(messagesKey(sessionId));
    return raw ? (JSON.parse(raw) as ChatMessageDto[]) : [];
  } catch {
    return [];
  }
}

export function saveVercelMessages(
  sessionId: string,
  messages: ChatMessageDto[],
) {
  localStorage.setItem(messagesKey(sessionId), JSON.stringify(messages));
}

export function createVercelSession(): SessionDto {
  const now = Date.now();
  const session: SessionDto = {
    id: uid(),
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
  localStorage.removeItem(messagesKey(id));
}

export function touchVercelSessionTitle(sessionId: string, title: string) {
  updateVercelSession(sessionId, { title });
}
