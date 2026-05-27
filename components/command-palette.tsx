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
  ImageIcon,
  Trash2,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  onNewChat: () => void;
  onSwitchChat: () => void;
  onSwitchImages: () => void;
  onClearHistory: () => void;
  onToggleSidebar: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette({
  onNewChat,
  onSwitchChat,
  onSwitchImages,
  onClearHistory,
  onToggleSidebar,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "new-chat",
        label: "New chat",
        icon: MessageSquarePlus,
        run: () => {
          onNewChat();
          close();
        },
      },
      {
        id: "switch-chat",
        label: "Switch to Chat",
        icon: MessageSquare,
        run: () => {
          onSwitchChat();
          close();
        },
      },
      {
        id: "switch-images",
        label: "Switch to Images",
        icon: ImageIcon,
        run: () => {
          onSwitchImages();
          close();
        },
      },
      {
        id: "clear-history",
        label: "Clear chat history",
        icon: Trash2,
        run: () => {
          if (confirm("Clear all chat history? This cannot be undone.")) {
            onClearHistory();
          }
          close();
        },
      },
      {
        id: "toggle-sidebar",
        label: "Toggle sidebar",
        icon: PanelLeft,
        run: () => {
          onToggleSidebar();
          close();
        },
      },
    ],
    [
      onNewChat,
      onSwitchChat,
      onSwitchImages,
      onClearHistory,
      onToggleSidebar,
      close,
    ],
  );

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlight(0);
      requestAnimationFrame(() => dialogRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (highlight >= commands.length) setHighlight(0);
  }, [highlight, commands.length]);

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commands[highlight]?.run();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[14vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={onListKey}
            className="glass w-full max-w-md overflow-hidden rounded-xl border border-white/[0.06] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8)] outline-none"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Commands
              </span>
              <kbd className="rounded border border-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/35">
                esc
              </kbd>
            </div>
            <ul className="p-1.5">
              {commands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const active = idx === highlight;
                return (
                  <li key={cmd.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={cmd.run}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition duration-200",
                        active
                          ? "bg-helix/10 text-white shadow-[inset_0_0_0_1px_rgba(94,234,212,0.2)]"
                          : "text-white/60 hover:bg-white/[0.04] hover:text-white/90",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          active ? "text-helix" : "text-white/35",
                        )}
                      />
                      <span className="flex-1">{cmd.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
