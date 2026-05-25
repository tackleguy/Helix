import type { Conversation } from "./types";

const STORAGE_KEY = "helix-state-v1";

export interface PersistedState {
  conversations: Conversation[];
  activeId: string | null;
  selectedModelId: string;
  selectedPromptId?: string;
  temperature?: number;
  maxTokens?: number;
}

const isBrowser = typeof window !== "undefined";

export function loadState(): PersistedState | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded or storage disabled — ignore */
  }
}

export function clearState(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function isPersistedState(v: unknown): v is PersistedState {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.conversations)) return false;
  if (typeof o.selectedModelId !== "string") return false;
  if (o.activeId !== null && typeof o.activeId !== "string") return false;
  return o.conversations.every(isConversation);
}

function isConversation(v: unknown): v is Conversation {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.title === "string" &&
    typeof c.createdAt === "number" &&
    typeof c.updatedAt === "number" &&
    Array.isArray(c.messages)
  );
}
