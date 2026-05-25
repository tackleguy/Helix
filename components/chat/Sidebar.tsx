"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquarePlus,
  Trash2,
  PanelLeftClose,
  Hexagon,
  Eraser,
} from "lucide-react";
import { useChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: Props) {
  const { state, newChat, selectChat, deleteChat, clearAll } = useChat();
  const sorted = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative z-20 flex h-full w-[260px] flex-shrink-0 flex-col border-r border-line-subtle bg-bg-subtle/80 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/40 shadow-glow">
                <Hexagon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold tracking-tight">Helix</span>
            </div>
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="px-3 pb-2">
            <button
              onClick={newChat}
              className="group flex w-full items-center gap-2 rounded-lg border border-line-subtle bg-bg-panel px-3 py-2 text-sm font-medium text-fg transition hover:border-line hover:bg-bg-elevated"
            >
              <MessageSquarePlus className="h-4 w-4 text-fg-muted transition group-hover:text-accent" />
              New chat
              <kbd className="ml-auto rounded border border-line-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
                ⌘N
              </kbd>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
            <div className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              Recent
            </div>
            <ul className="flex flex-col gap-0.5">
              {sorted.map((c) => {
                const active = c.id === state.activeId;
                return (
                  <li key={c.id}>
                    <div
                      className={cn(
                        "group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition",
                        active
                          ? "bg-bg-elevated text-fg"
                          : "text-fg-muted hover:bg-bg-panel hover:text-fg",
                      )}
                    >
                      <button
                        onClick={() => selectChat(c.id)}
                        className="flex-1 truncate text-left"
                      >
                        {c.title || "Untitled"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(c.id);
                        }}
                        className="opacity-0 transition group-hover:opacity-100"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-fg-subtle hover:text-red-400" />
                      </button>
                    </div>
                  </li>
                );
              })}
              {sorted.length === 0 && (
                <li className="px-2.5 py-3 text-xs text-fg-subtle">
                  No conversations yet.
                </li>
              )}
            </ul>
          </div>

          <div className="border-t border-line-subtle px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent/80 to-accent/30" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium text-fg">
                  Local user
                </span>
                <span className="truncate text-[11px] text-fg-subtle">
                  Helix • v0.2
                </span>
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Delete all conversations? This cannot be undone.",
                    )
                  ) {
                    clearAll();
                  }
                }}
                className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-red-400"
                aria-label="Clear all conversations"
                title="Clear all conversations"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
