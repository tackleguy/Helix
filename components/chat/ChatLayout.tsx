"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "./ChatPanel";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { DockNav } from "@/components/nav/DockNav";

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />

      <DockNav active="chat" />
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />

      <div className="relative z-10 flex flex-1 flex-col">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ChatPanel />
      </div>

      <CommandPalette onOpenSettings={() => setSettingsOpen(true)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
