"use client";

import { ImageIcon, MessageSquare, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "chat" | "images";

interface TopBarProps {
  view: View;
  sidebarOpen: boolean;
  onSwitchView: (view: View) => void;
  onToggleSidebar: () => void;
}

export function TopBar({
  view,
  sidebarOpen,
  onSwitchView,
  onToggleSidebar,
}: TopBarProps) {
  return (
    <header className="flex h-11 flex-shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
      {!sidebarOpen && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
          className="grid h-7 w-7 place-items-center rounded-md text-white/40 transition hover:bg-white/[0.04] hover:text-white/70"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      <nav className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-ink-900/50 p-0.5">
        <TabButton
          active={view === "chat"}
          onClick={() => onSwitchView("chat")}
          icon={MessageSquare}
          label="Chat"
        />
        <TabButton
          active={view === "images"}
          onClick={() => onSwitchView("images")}
          icon={ImageIcon}
          label="Images"
        />
      </nav>

      <span className="ml-auto font-mono text-[10px] text-white/20">⌘K</span>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof MessageSquare;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition duration-200",
        active
          ? "bg-white/[0.06] text-white/90"
          : "text-white/40 hover:text-white/65",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
