"use client";

import { PanelLeftOpen, ChevronDown, Sparkles } from "lucide-react";
import { useChat } from "@/lib/chat-store";

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ sidebarOpen, onToggleSidebar }: Props) {
  const { activeConversation } = useChat();

  return (
    <header className="relative z-10 flex h-12 items-center gap-2 border-b border-line-subtle bg-bg/60 px-3 backdrop-blur-xl">
      {!sidebarOpen && (
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-fg">
          {activeConversation?.title || "New chat"}
        </span>
      </div>

      <button className="flex items-center gap-1.5 rounded-md border border-line-subtle bg-bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted transition hover:border-line hover:text-fg">
        <Sparkles className="h-3 w-3 text-accent" />
        Helix-Mock
        <ChevronDown className="h-3 w-3 text-fg-subtle" />
      </button>
    </header>
  );
}
