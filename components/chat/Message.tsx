"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Hexagon,
  User,
  Volume2,
  Square,
  Copy,
  Check,
} from "lucide-react";
import type { Message as MessageType } from "@/lib/types";
import { Markdown } from "./Markdown";
import { ThinkingBlock } from "./ThinkingBlock";
import { parseStream } from "@/lib/protocol";
import { isTtsSupported, speak, stopSpeaking, type TtsHandle } from "@/lib/tts";
import { cn } from "@/lib/utils";

interface Props {
  message: MessageType;
}

export function Message({ message }: Props) {
  const isUser = message.role === "user";
  const parsed = isUser
    ? { thinking: "", thinkingOpen: false, content: message.content }
    : parseStream(message.content);

  const isPending =
    message.pending &&
    parsed.content.length === 0 &&
    parsed.thinking.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/40 shadow-glow">
          <Hexagon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
      )}

      <div
        className={cn(
          "group flex min-w-0 max-w-[85%] flex-col gap-1.5",
          isUser && "items-end",
        )}
      >
        {!isUser && parsed.thinking && (
          <ThinkingBlock
            text={parsed.thinking}
            streaming={parsed.thinkingOpen}
          />
        )}

        {isPending ? (
          <div className="px-1">
            <ThinkingDots />
          </div>
        ) : parsed.content ? (
          <>
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed",
                isUser ? "bg-bg-elevated text-fg" : "bg-transparent text-fg",
              )}
            >
              <Markdown content={parsed.content} />
            </div>

            {!isUser && !message.pending && (
              <MessageActions text={parsed.content} />
            )}
          </>
        ) : null}
      </div>

      {isUser && (
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-md border border-line-subtle bg-bg-panel">
          <User className="h-3.5 w-3.5 text-fg-muted" />
        </div>
      )}
    </motion.div>
  );
}

function MessageActions({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tts, setTts] = useState(false);
  const handleRef = useRef<TtsHandle | null>(null);

  useEffect(() => {
    setTts(isTtsSupported());
    return () => {
      handleRef.current?.stop();
    };
  }, []);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      handleRef.current = null;
      return;
    }
    const h = speak(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => {
        setSpeaking(false);
        handleRef.current = null;
      },
      onError: () => {
        setSpeaking(false);
        handleRef.current = null;
      },
    });
    if (h) handleRef.current = h;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-1 px-1 opacity-0 transition group-hover:opacity-100">
      {tts && (
        <button
          onClick={toggleSpeak}
          aria-label={speaking ? "Stop speaking" : "Read aloud"}
          title={speaking ? "Stop" : "Read aloud"}
          className={cn(
            "grid h-6 w-6 place-items-center rounded-md transition",
            speaking
              ? "bg-accent text-white"
              : "text-fg-subtle hover:bg-bg-elevated hover:text-fg",
          )}
        >
          {speaking ? (
            <Square className="h-3 w-3" fill="currentColor" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
        </button>
      )}
      <button
        onClick={copy}
        aria-label="Copy message"
        title="Copy message"
        className="grid h-6 w-6 place-items-center rounded-md text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-fg-muted animate-pulse-dot" />
      <span
        className="h-1.5 w-1.5 rounded-full bg-fg-muted animate-pulse-dot"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-fg-muted animate-pulse-dot"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}
