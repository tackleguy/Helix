"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquarePlus,
  MessageSquare,
  Sparkles,
  Search,
  Settings,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { useChat } from "@/lib/chat-store";
import type { ModelInfo } from "@/lib/models";
import { cn } from "@/lib/utils";

interface Props {
  onOpenSettings: () => void;
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof MessageSquare;
  group: "Actions" | "Models" | "Chats" | "Navigate";
  run: () => void;
}

export function CommandPalette({ onOpenSettings }: Props) {
  const { state, newChat, selectChat, deleteChat, setModel } = useChat();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // global hotkey
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // fetch model list once on first open
  useEffect(() => {
    if (!open || models.length > 0) return;
    fetch("/api/models", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setModels(d.models))
      .catch(() => undefined);
  }, [open, models.length]);

  // refocus input + reset state on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const commands: Command[] = useMemo(() => {
    const list: Command[] = [
      {
        id: "new-chat",
        label: "New chat",
        hint: "⌘N",
        icon: MessageSquarePlus,
        group: "Actions",
        run: () => {
          newChat();
          close();
        },
      },
      {
        id: "open-images",
        label: "Open image generation",
        icon: ImageIcon,
        group: "Navigate",
        run: () => {
          window.location.href = "/images";
          close();
        },
      },
      {
        id: "open-settings",
        label: "Open settings",
        hint: "⌘,",
        icon: Settings,
        group: "Actions",
        run: () => {
          onOpenSettings();
          close();
        },
      },
    ];

    for (const m of models) {
      list.push({
        id: `model-${m.id}`,
        label: `Switch model · ${m.label}`,
        hint: m.available ? "live" : "unavailable",
        icon: Sparkles,
        group: "Models",
        run: () => {
          setModel(m.id);
          close();
        },
      });
    }

    for (const c of state.conversations.slice(0, 30)) {
      list.push({
        id: `chat-${c.id}`,
        label: c.title || "Untitled chat",
        hint: new Date(c.updatedAt).toLocaleDateString(),
        icon: MessageSquare,
        group: "Chats",
        run: () => {
          selectChat(c.id);
          close();
        },
      });
      list.push({
        id: `del-${c.id}`,
        label: `Delete · ${c.title || "Untitled"}`,
        icon: Trash2,
        group: "Chats",
        run: () => {
          deleteChat(c.id);
          close();
        },
      });
    }
    return list;
  }, [models, state.conversations, newChat, selectChat, deleteChat, setModel, close, onOpenSettings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => !c.id.startsWith("del-"));
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  // clamp highlight to filtered length
  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[highlight]?.run();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            initial={{ y: -16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="glass w-full max-w-xl overflow-hidden rounded-2xl shadow-panel"
          >
            <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-3">
              <Search className="h-4 w-4 text-fg-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search commands, chats, models…"
                className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
              />
              <kbd className="rounded border border-line-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
                ESC
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-1 scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-fg-subtle">
                  No matches.
                </div>
              ) : (
                groupItems(filtered).map(([group, items]) => (
                  <div key={group} className="py-1">
                    <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                      {group}
                    </div>
                    {items.map((cmd) => {
                      const idx = filtered.indexOf(cmd);
                      const active = idx === highlight;
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={cmd.run}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                            active
                              ? "bg-bg-elevated text-fg"
                              : "text-fg-muted hover:bg-bg-elevated/60",
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0 text-fg-subtle" />
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {cmd.hint && (
                            <span className="font-mono text-[10px] text-fg-subtle">
                              {cmd.hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function groupItems(items: Command[]): Array<[string, Command[]]> {
  const map = new Map<string, Command[]>();
  for (const c of items) {
    const arr = map.get(c.group) ?? [];
    arr.push(c);
    map.set(c.group, arr);
  }
  return Array.from(map.entries());
}
