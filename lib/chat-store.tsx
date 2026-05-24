"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { Conversation, Message } from "./types";
import { uid } from "./utils";

interface State {
  conversations: Conversation[];
  activeId: string | null;
  streaming: boolean;
}

type Action =
  | { type: "new_conversation" }
  | { type: "select"; id: string }
  | { type: "delete"; id: string }
  | { type: "rename"; id: string; title: string }
  | { type: "append_message"; conversationId: string; message: Message }
  | {
      type: "update_message";
      conversationId: string;
      messageId: string;
      patch: Partial<Message>;
    }
  | { type: "set_streaming"; value: boolean };

function newConversation(): Conversation {
  const now = Date.now();
  return {
    id: uid(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "new_conversation": {
      const c = newConversation();
      return {
        ...state,
        conversations: [c, ...state.conversations],
        activeId: c.id,
      };
    }
    case "select":
      return { ...state, activeId: action.id };
    case "delete": {
      const next = state.conversations.filter((c) => c.id !== action.id);
      const activeId =
        state.activeId === action.id ? (next[0]?.id ?? null) : state.activeId;
      return { ...state, conversations: next, activeId };
    }
    case "rename":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.id ? { ...c, title: action.title } : c,
        ),
      };
    case "append_message":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? {
                ...c,
                messages: [...c.messages, action.message],
                updatedAt: Date.now(),
              }
            : c,
        ),
      };
    case "update_message":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === action.messageId ? { ...m, ...action.patch } : m,
                ),
                updatedAt: Date.now(),
              }
            : c,
        ),
      };
    case "set_streaming":
      return { ...state, streaming: action.value };
  }
}

function initialState(): State {
  const c = newConversation();
  return { conversations: [c], activeId: c.id, streaming: false };
}

interface ChatContextValue {
  state: State;
  activeConversation: Conversation | null;
  newChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId) ?? null,
    [state.conversations, state.activeId],
  );

  const newChat = useCallback(() => dispatch({ type: "new_conversation" }), []);
  const selectChat = useCallback(
    (id: string) => dispatch({ type: "select", id }),
    [],
  );
  const deleteChat = useCallback(
    (id: string) => dispatch({ type: "delete", id }),
    [],
  );
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "set_streaming", value: false });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      let conversationId = state.activeId;
      if (!conversationId) {
        const c = newConversation();
        dispatch({ type: "new_conversation" });
        conversationId = c.id;
      }
      const cid = conversationId!;

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      dispatch({ type: "append_message", conversationId: cid, message: userMsg });

      const current = state.conversations.find((c) => c.id === cid);
      if (current && current.messages.length === 0) {
        const title = trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
        dispatch({ type: "rename", id: cid, title });
      }

      const assistantId = uid();
      dispatch({
        type: "append_message",
        conversationId: cid,
        message: {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          pending: true,
        },
      });

      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "set_streaming", value: true });

      try {
        const conv = state.conversations.find((c) => c.id === cid);
        const history = (conv?.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        history.push({ role: "user", content: trimmed });

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
            type: "update_message",
            conversationId: cid,
            messageId: assistantId,
            patch: { content: acc },
          });
        }
        dispatch({
          type: "update_message",
          conversationId: cid,
          messageId: assistantId,
          patch: { pending: false },
        });
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        dispatch({
          type: "update_message",
          conversationId: cid,
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
    [state.activeId, state.conversations],
  );

  const value: ChatContextValue = {
    state,
    activeConversation,
    newChat,
    selectChat,
    deleteChat,
    sendMessage,
    stopStreaming,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
