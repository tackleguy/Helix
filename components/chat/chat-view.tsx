"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Composer, type ComposerAttachment } from "./composer";
import { Message } from "./message";
import { ChatHeader } from "./chat-header";
import { SystemPromptPanel } from "./system-prompt-panel";
import type { ChatMessageDto, SessionDto } from "@/lib/chat/types";

interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chat/sessions/${sessionId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) router.replace("/chat");
      return;
    }
    const data = (await res.json()) as {
      session: SessionDto;
      messages: ChatMessageDto[];
    };
    setSession(data.session);
    setMessages(data.messages);
  }, [sessionId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const streamChat = async (body: Record<string, unknown>) => {
    setError(null);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("no stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6)) as {
            type: string;
            assistantId?: string;
            text?: string;
            backend?: string;
            model?: string;
            error?: string;
          };

          if (payload.type === "meta" && payload.assistantId) {
            assistantId = payload.assistantId;
            setBackend(payload.backend ?? null);
            setMessages((m) => {
              if (m.some((x) => x.id === assistantId)) return m;
              return [
                ...m,
                {
                  id: assistantId!,
                  role: "assistant",
                  content: "",
                  tokensIn: null,
                  tokensOut: null,
                  createdAt: Date.now(),
                },
              ];
            });
          }

          if (payload.type === "delta" && payload.text && assistantId) {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + payload.text! }
                  : msg,
              ),
            );
          }

          if (payload.type === "error") {
            throw new Error(payload.error ?? "stream error");
          }
        }
      }

      await load();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Chat failed");
      await load();
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const onSend = async ({
    message,
    attachments,
  }: {
    message: string;
    attachments: ComposerAttachment[];
  }) => {
    if (editDraft !== null) {
      await streamChat({
        sessionId,
        editLastUser: message,
        attachments: attachments.map(({ id: _id, ...rest }) => rest),
      });
      setEditDraft(null);
      return;
    }
    await streamChat({
      sessionId,
      message,
      attachments: attachments.map(({ id: _id, ...rest }) => rest),
    });
  };

  const onRegenerate = () =>
    void streamChat({ sessionId, regenerate: true });

  const onContinue = () => void streamChat({ sessionId, continue: true });

  const onEditLastUser = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) setEditDraft(lastUser.content);
  };

  const onStop = () => abortRef.current?.abort();

  const saveSystemPrompt = async (systemPrompt: string) => {
    await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt: systemPrompt || null }),
    });
    await load();
  };

  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHeader
        title={session?.title ?? "Chat"}
        model={session?.model ?? null}
        backend={backend}
        messages={messages}
        onOpenSystemPrompt={() => setPromptOpen(true)}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {messages.length === 0 && !streaming && (
            <div className="py-20 text-center">
              <h2 className="wordmark text-3xl text-white/75">Helix</h2>
              <p className="mt-2 text-sm text-white/35">
                Local models · streaming · your data stays on device
              </p>
            </div>
          )}
          {messages.map((m) => (
            <Message
              key={m.id}
              message={m}
              streaming={streaming && m.id === lastAssistantId && !m.content}
              isLastAssistant={
                m.role === "assistant" && m.id === lastAssistantId
              }
              onRegenerate={
                m.role === "assistant" && m.id === lastAssistantId
                  ? onRegenerate
                  : undefined
              }
              onContinue={
                m.role === "assistant" && m.id === lastAssistantId
                  ? onContinue
                  : undefined
              }
              onEditUser={m.role === "user" ? onEditLastUser : undefined}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-auto mb-2 max-w-2xl rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300/90">
          {error}
          <span className="block text-white/35">
            Start LM Studio, Ollama, or llama-server — then check Settings →
            Services.
          </span>
        </div>
      )}

      <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
        <div className="mx-auto max-w-2xl">
          {editDraft !== null && (
            <p className="mb-2 text-[11px] text-helix/80">
              Editing last message — send to replace it and following replies.
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => setEditDraft(null)}
              >
                Cancel
              </button>
            </p>
          )}
          <Composer
            streaming={streaming}
            onSend={onSend}
            onStop={onStop}
            draft={editDraft ?? undefined}
            onDraftChange={editDraft !== null ? setEditDraft : undefined}
          />
        </div>
      </div>

      <SystemPromptPanel
        open={promptOpen}
        value={session?.systemPrompt ?? ""}
        onClose={() => setPromptOpen(false)}
        onSave={saveSystemPrompt}
      />
    </div>
  );
}
