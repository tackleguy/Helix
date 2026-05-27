"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Session } from "@/components/chat-view";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessions: Session[];
  activeId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  sessions,
  activeId,
  onNewChat,
  onSelect,
  onDelete,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[240px] flex-shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/80">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <span className="wordmark text-lg text-white/90">Helix</span>
      </div>

      <div className="px-2 pt-2">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-sm text-white/70 transition duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5 text-helix" />
          New chat
        </button>
      </div>

      <div className="px-3 pb-1 pt-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">
          Recent
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 pb-3 scrollbar-thin">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-white/25">
            No chats yet
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sessions.map((s) => {
              const active = s.id === activeId;
              return (
                <li key={s.id}>
                  <div
                    className={cn(
                      "group flex items-center rounded-md border-l-2 transition duration-200",
                      active
                        ? "border-helix bg-white/[0.04]"
                        : "border-transparent hover:bg-white/[0.03]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className="flex-1 truncate px-2.5 py-1.5 text-left text-sm text-white/60 transition hover:text-white/90"
                    >
                      {s.title || "New chat"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(s.id);
                      }}
                      aria-label="Delete chat"
                      className="mr-1.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-white/20 opacity-0 transition duration-200 hover:bg-white/[0.06] hover:text-white/60 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
