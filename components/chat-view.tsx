"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { Composer } from "@/components/composer";
import { Message, type ChatMessage } from "@/components/message";
import { uid } from "@/lib/utils";

const STORAGE_KEY = "helix.sessions.v1";

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

interface PersistedSessions {
  sessions: Session[];
  activeId: string | null;
}

interface SessionsState {
  sessions: Session[];
  activeId: string | null;
  streaming: boolean;
}

type SessionsAction =
  | { type: "hydrate"; payload: PersistedSessions }
  | { type: "new_session" }
  | { type: "add_session"; session: Session }
  | { type: "select"; id: string }
  | { type: "delete"; id: string }
  | { type: "rename"; id: string; title: string }
  | { type: "append"; sessionId: string; message: ChatMessage }
  | {
      type: "update";
      sessionId: string;
      messageId: string;
      patch: Partial<ChatMessage>;
    }
  | { type: "set_streaming"; value: boolean }
  | { type: "clear_all" };

function newSession(): Session {
  const now = Date.now();
  return {
    id: uid(),
    title: "New chat",
    createdAt: now,
    messages: [],
  };
}

function sessionsReducer(
  state: SessionsState,
  action: SessionsAction,
): SessionsState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        sessions: action.payload.sessions,
        activeId: action.payload.activeId,
      };
    case "new_session": {
      const s = newSession();
      return {
        ...state,
        sessions: [s, ...state.sessions],
        activeId: s.id,
      };
    }
    case "add_session":
      return {
        ...state,
        sessions: [action.session, ...state.sessions],
        activeId: action.session.id,
      };
    case "select":
      return { ...state, activeId: action.id };
    case "delete": {
      const next = state.sessions.filter((s) => s.id !== action.id);
      const activeId =
        state.activeId === action.id ? (next[0]?.id ?? null) : state.activeId;
      return { ...state, sessions: next, activeId };
    }
    case "rename":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.id ? { ...s, title: action.title } : s,
        ),
      };
    case "append":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? { ...s, messages: [...s.messages, action.message] }
            : s,
        ),
      };
    case "update":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === action.messageId ? { ...m, ...action.patch } : m,
                ),
              }
            : s,
        ),
      };
    case "set_streaming":
      return { ...state, streaming: action.value };
    case "clear_all": {
      const s = newSession();
      return { sessions: [s], activeId: s.id, streaming: false };
    }
  }
}

function initialSessionsState(): SessionsState {
  const s = newSession();
  return { sessions: [s], activeId: s.id, streaming: false };
}

function loadSessions(): PersistedSessions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (!Array.isArray(o.sessions)) return null;
    const sessions = o.sessions.filter(isSession);
    if (sessions.length === 0) return null;
    const activeId =
      typeof o.activeId === "string" &&
      sessions.some((s) => s.id === o.activeId)
        ? o.activeId
        : sessions[0].id;
    return { sessions, activeId };
  } catch {
    return null;
  }
}

function saveSessions(data: PersistedSessions) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

function isSession(v: unknown): v is Session {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.createdAt === "number" &&
    Array.isArray(s.messages)
  );
}

function titleFromMessage(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

export function useSessions() {
  const [state, dispatch] = useReducer(
    sessionsReducer,
    undefined,
    initialSessionsState,
  );
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const persisted = loadSessions();
    if (persisted) dispatch({ type: "hydrate", payload: persisted });
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSessions({
        sessions: state.sessions,
        activeId: state.activeId,
      });
    }, 250);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.sessions, state.activeId]);

  const activeSession = useMemo(
    () => state.sessions.find((s) => s.id === state.activeId) ?? null,
    [state.sessions, state.activeId],
  );

  const sortedSessions = useMemo(
    () => [...state.sessions].sort((a, b) => b.createdAt - a.createdAt),
    [state.sessions],
  );

  const newChat = useCallback(() => dispatch({ type: "new_session" }), []);
  const selectChat = useCallback(
    (id: string) => dispatch({ type: "select", id }),
    [],
  );
  const deleteChat = useCallback(
    (id: string) => dispatch({ type: "delete", id }),
    [],
  );
  const clearAll = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({ type: "clear_all" });
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "set_streaming", value: false });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || state.streaming) return;

      let sessionId = state.activeId;
      if (!sessionId) {
        const s = newSession();
        dispatch({ type: "add_session", session: s });
        sessionId = s.id;
      }

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: trimmed,
      };
      dispatch({ type: "append", sessionId, message: userMsg });

      const session = state.sessions.find((s) => s.id === sessionId);
      if (session && session.messages.length === 0) {
        dispatch({
          type: "rename",
          id: sessionId,
          title: titleFromMessage(trimmed),
        });
      }

      const assistantId = uid();
      dispatch({
        type: "append",
        sessionId,
        message: {
          id: assistantId,
          role: "assistant",
          content: "",
          pending: true,
        },
      });

      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "set_streaming", value: true });

      try {
        const history = (session?.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        history.push({ role: "user" as const, content: trimmed });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          dispatch({
            type: "update",
            sessionId,
            messageId: assistantId,
            patch: { content: acc },
          });
        }
        dispatch({
          type: "update",
          sessionId,
          messageId: assistantId,
          patch: { pending: false },
        });
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        dispatch({
          type: "update",
          sessionId,
          messageId: assistantId,
          patch: {
            pending: false,
            content: aborted
              ? "_Stopped._"
              : "_Something went wrong reaching the model._",
          },
        });
      } finally {
        abortRef.current = null;
        dispatch({ type: "set_streaming", value: false });
      }
    },
    [state.activeId, state.sessions, state.streaming],
  );

  return {
    sessions: sortedSessions,
    activeId: state.activeId,
    activeSession,
    streaming: state.streaming,
    newChat,
    selectChat,
    deleteChat,
    clearAll,
    sendMessage,
    stopStreaming,
  };
}

interface ChatViewProps {
  activeSession: Session | null;
  streaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}

export function ChatView({
  activeSession,
  streaming,
  onSend,
  onStop,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const submit = () => {
    const v = input.trim();
    if (!v || streaming) return;
    onSend(v);
    setInput("");
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <h2 className="wordmark text-3xl text-white/80">Helix</h2>
              <p className="mt-2 text-sm text-white/35">
                Ask anything to get started.
              </p>
            </motion.div>
          ) : (
            messages.map((m) => <Message key={m.id} message={m} />)
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08090b] via-[#08090b]/90 to-transparent pt-10">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl px-4 pb-4">
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={submit}
            onStop={onStop}
            streaming={streaming}
            placeholder="Message Helix…"
          />
        </div>
      </div>
    </div>
  );
}
