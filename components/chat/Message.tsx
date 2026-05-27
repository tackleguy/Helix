"use client";

import { motion } from "framer-motion";
import { Pencil, RefreshCw, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessageDto } from "@/lib/chat/types";
import { Markdown } from "./markdown";

interface MessageProps {
  message: ChatMessageDto;
  isLastAssistant?: boolean;
  streaming?: boolean;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onEditUser?: () => void;
}

export function Message({
  message,
  isLastAssistant,
  streaming,
  onRegenerate,
  onContinue,
  onEditUser,
}: MessageProps) {
  const isUser = message.role === "user";
  const pending = streaming && !message.content && message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("group flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[88%]",
          isUser ? "rounded-xl bg-ink-850 px-3.5 py-2 text-sm text-white/90" : "",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : pending ? (
          <ThinkingDots />
        ) : (
          <Markdown content={message.content} />
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.attachments.map((a) => (
              <span
                key={a.name}
                className="rounded-md border border-white/[0.06] bg-ink-900 px-2 py-0.5 text-[10px] text-white/45"
              >
                {a.type}: {a.name}
              </span>
            ))}
          </div>
        )}

        {isLastAssistant && !pending && !streaming && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition duration-200 group-hover:opacity-100">
            {onContinue && (
              <ActionBtn icon={Play} label="Continue" onClick={onContinue} />
            )}
            {onRegenerate && (
              <ActionBtn
                icon={RefreshCw}
                label="Regenerate"
                onClick={onRegenerate}
              />
            )}
          </div>
        )}

        {isUser && onEditUser && (
          <div className="mt-1 flex justify-end opacity-0 transition group-hover:opacity-100">
            <ActionBtn icon={Pencil} label="Edit" onClick={onEditUser} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/[0.04] hover:text-white/70"
    >
      <Icon className="h-3 w-3" strokeWidth={1.75} />
      {label}
    </button>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse-dot"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}
