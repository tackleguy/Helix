"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/lib/chat-store";
import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";

export function ChatPanel() {
  const { activeConversation, state, sendMessage, stopStreaming } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, state.streaming]);

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6">
          {isEmpty ? (
            <EmptyState onPrompt={(p) => sendMessage(p)} />
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/80 to-transparent pt-12">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl px-4 pb-4">
          <ChatInput
            streaming={state.streaming}
            onSend={sendMessage}
            onStop={stopStreaming}
          />
          <p className="mt-2 text-center text-[11px] text-fg-subtle">
            Helix proxies to{" "}
            <code className="rounded bg-bg-panel px-1 py-0.5 font-mono text-[10px] text-fg-muted">
              llama.cpp
            </code>{" "}
            when available, mock otherwise. Configure via{" "}
            <code className="rounded bg-bg-panel px-1 py-0.5 font-mono text-[10px] text-fg-muted">
              .env.local
            </code>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
