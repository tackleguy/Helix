"use client";

import { motion } from "framer-motion";
import { Hexagon, User } from "lucide-react";
import type { Message as MessageType } from "@/lib/types";
import { Markdown } from "./Markdown";
import { ThinkingBlock } from "./ThinkingBlock";
import { parseStream } from "@/lib/protocol";
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
          "flex min-w-0 max-w-[85%] flex-col gap-1.5",
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
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed",
              isUser ? "bg-bg-elevated text-fg" : "bg-transparent text-fg",
            )}
          >
            <Markdown content={parsed.content} />
          </div>
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
