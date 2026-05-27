"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import {
  COMMAND_DEFINITIONS,
  filterCommands,
  type CommandDefinition,
} from "@/lib/commands";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, runCommand } = useWorkspace();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterCommands(query), [query]);

  const close = useCallback(() => setPaletteOpen(false), [setPaletteOpen]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "Escape" && paletteOpen) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paletteOpen, close, setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [highlight, filtered.length]);

  const execute = useCallback(
    async (cmd: CommandDefinition) => {
      if (cmd.href) {
        router.push(cmd.href);
        close();
        return;
      }
      if (cmd.action) {
        await runCommand(cmd.action);
        close();
      }
    },
    [router, close, runCommand],
  );

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      void execute(filtered[highlight]);
    }
  };

  const grouped = useMemo(() => groupCommands(filtered), [filtered]);

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={onListKey}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="glass w-full max-w-lg overflow-hidden rounded-xl border border-white/[0.06] outline-none"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
              <Search className="h-4 w-4 text-white/30" strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands…"
                className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
              />
              <kbd className="rounded border border-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/30">
                esc
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-thin">
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-white/35">
                  No matches
                </p>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group} className="py-1">
                    <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
                      {group}
                    </p>
                    {items.map((cmd) => {
                      const idx = filtered.indexOf(cmd);
                      const active = idx === highlight;
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => void execute(cmd)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition duration-200",
                            active
                              ? "bg-helix/10 text-white"
                              : "text-white/55 hover:bg-white/[0.04] hover:text-white/85",
                            cmd.destructive && !active && "text-red-300/70",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              active ? "text-helix" : "text-white/35",
                            )}
                            strokeWidth={1.75}
                          />
                          <span className="flex-1">{cmd.label}</span>
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

function groupCommands(
  items: CommandDefinition[],
): Array<[string, CommandDefinition[]]> {
  const map = new Map<string, CommandDefinition[]>();
  for (const c of items) {
    const arr = map.get(c.group) ?? [];
    arr.push(c);
    map.set(c.group, arr);
  }
  return Array.from(map.entries());
}

// keep registry referenced for tree-shaking guard
void COMMAND_DEFINITIONS;
