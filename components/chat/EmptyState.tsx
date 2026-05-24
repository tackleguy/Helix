"use client";

import { motion } from "framer-motion";
import { Hexagon, Code2, Sparkles, FileText, Lightbulb } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: Code2,
    title: "Show me the streaming contract",
    prompt: "Give me a code example of how the chat streaming works.",
  },
  {
    icon: Sparkles,
    title: "What can Helix do?",
    prompt: "Tell me what Helix is and what's already wired up.",
  },
  {
    icon: FileText,
    title: "Plug in a real model",
    prompt: "How do I swap the mock for a real local model?",
  },
  {
    icon: Lightbulb,
    title: "Suggest next features",
    prompt: "What should I build next on top of this chat shell?",
  },
];

interface Props {
  onPrompt: (p: string) => void;
}

export function EmptyState({ onPrompt }: Props) {
  return (
    <div className="flex flex-col items-center pt-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent/40 shadow-glow"
      >
        <Hexagon className="h-7 w-7 text-white" strokeWidth={2.2} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-5 text-balance text-2xl font-semibold tracking-tight"
      >
        How can I help today?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-2 max-w-md text-sm text-fg-muted"
      >
        Local-first AI workspace. Start a conversation or pick a prompt below.
      </motion.p>

      <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
              onClick={() => onPrompt(s.prompt)}
              className="group flex items-start gap-3 rounded-xl border border-line-subtle bg-bg-panel/60 p-3.5 text-left transition hover:border-line hover:bg-bg-elevated"
            >
              <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-md bg-bg-elevated text-fg-muted transition group-hover:bg-accent/15 group-hover:text-accent">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-fg">{s.title}</span>
                <span className="mt-0.5 line-clamp-1 text-xs text-fg-subtle">
                  {s.prompt}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
