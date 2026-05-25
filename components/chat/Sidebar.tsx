"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquarePlus,
  Trash2,
  PanelLeftClose,
  Hexagon,
  Eraser,
  Search,
} from "lucide-react";
import { useChat } from "@/lib/chat-store";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onToggle: () => void;
}

const DAY = 24 * 60 * 60 * 1000;

function bucketFor(ts: number, now: number): string {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const t = new Date(ts);
  const n = new Date(now);
  if (sameDay(t, n)) return "Today";
  const y = new Date(now - DAY);
  if (sameDay(t, y)) return "Yesterday";
  if (now - ts < 7 * DAY) return "This week";
  if (now - ts < 30 * DAY) return "This month";
  return "Older";
}

const BUCKET_ORDER = ["Today", "Yesterday", "This week", "This month", "Older"];

export function Sidebar({ open, onToggle }: Props) {
  const { state, newChat, selectChat, deleteChat, clearAll } = useChat();

  const grouped = useMemo(() => {
    const now = Date.now();
    const buckets = new Map<string, Conversation[]>();
    const sorted = [...state.conversations].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    for (const c of sorted) {
      const key = bucketFor(c.updatedAt, now);
      const arr = buckets.get(key) ?? [];
      arr.push(c);
      buckets.set(key, arr);
    }
    return BUCKET_ORDER.flatMap((k) =>
      buckets.has(k) ? [[k, buckets.get(k)!] as const] : [],
    );
  }, [state.conversations]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -280, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative z-20 flex h-full w-[280px] flex-shrink-0 flex-col border-r border-line-subtle bg-bg-subtle/85 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent to-accent/40 shadow-glow">
                <Hexagon
                  className="h-3.5 w-3.5 text-white"
                  strokeWidth={2.5}
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">
                  Helix
                </span>
                <span className="text-[10px] uppercase tracking-wider text-fg-subtle">
                  AI workspace
                </span>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 px-3 pb-2">
            <button
              onClick={newChat}
              className="group flex w-full items-center gap-2 rounded-lg bg-gradient-to-br from-accent to-accent/70 px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:from-accent/95 hover:to-accent/65"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New chat
              <kbd className="ml-auto rounded border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                ⌘N
              </kbd>
            </button>
            <button
              onClick={() => {
                const evt = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(evt);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-line-subtle bg-bg-panel/60 px-3 py-2 text-sm text-fg-muted transition hover:border-line hover:bg-bg-elevated hover:text-fg"
            >
              <Search className="h-3.5 w-3.5" />
              Search & commands
              <kbd className="ml-auto rounded border border-line-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
            {grouped.length === 0 ? (
              <div className="px-2.5 py-6 text-center text-xs text-fg-subtle">
                No conversations yet. Hit New chat above.
              </div>
            ) : (
              grouped.map(([bucket, items]) => (
                <div key={bucket}>
                  <div className="px-2 pb-1.5 pt-3 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                    {bucket}
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {items.map((c) => {
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
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full transition",
                                active ? "bg-accent" : "bg-fg-subtle/40",
                              )}
                            />
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
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-line-subtle px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-line-subtle bg-bg-panel/60 px-2.5 py-2">
              <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent/40 text-white shadow-glow">
                <span className="font-mono text-[11px] font-bold">LX</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-xs font-medium text-fg">
                  Local user
                </span>
                <span className="truncate text-[10px] text-fg-subtle">
                  Helix · v0.3
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
