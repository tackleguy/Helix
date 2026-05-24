"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  streaming: boolean;
}

export function ThinkingBlock({ text, streaming }: Props) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, open, streaming]);

  return (
    <div className="w-fit max-w-full rounded-xl border border-line-subtle bg-bg-panel/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-fg-muted transition hover:text-fg"
      >
        <Brain
          className={cn(
            "h-3.5 w-3.5 text-accent",
            streaming && "animate-pulse-dot",
          )}
        />
        <span className="font-medium">
          {streaming ? "Thinking…" : "Thought"}
        </span>
        <span className="font-mono text-[10px] text-fg-subtle">
          {text.length.toLocaleString()} chars
        </span>
        {open ? (
          <ChevronDown className="ml-auto h-3 w-3" />
        ) : (
          <ChevronRight className="ml-auto h-3 w-3" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              ref={scrollRef}
              className="max-h-64 overflow-y-auto border-t border-line-subtle px-3 py-2 scrollbar-thin"
            >
              <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-fg-muted">
                {text}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
