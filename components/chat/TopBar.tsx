"use client";

import { PanelLeftOpen, Settings, Command } from "lucide-react";
import { useChat } from "@/lib/chat-store";
import { ModelPicker } from "./ModelPicker";

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
}: Props) {
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

      <button
        onClick={() => {
          const evt = new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          });
          document.dispatchEvent(evt);
        }}
        className="hidden items-center gap-1.5 rounded-md border border-line-subtle bg-bg-panel px-2 py-1.5 text-[11px] text-fg-subtle transition hover:border-line hover:text-fg sm:flex"
        aria-label="Command palette"
      >
        <Command className="h-3 w-3" />
        <span>K</span>
      </button>

      <ModelPicker />

      <button
        onClick={onOpenSettings}
        className="rounded-md p-1.5 text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>
    </header>
  );
}
