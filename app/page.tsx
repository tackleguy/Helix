"use client";

import { useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { useChat } from "@/lib/chat-store";

type View = "chat" | "images";

export default function HomePage() {
  const [view, setView] = useState<View>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { newChat, clearAll } = useChat();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#08090b] text-white">
      {sidebarOpen && (
        <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/80">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <span className="wordmark text-lg text-white/90">Helix</span>
          </div>
          <div className="px-3 py-2 text-[11px] text-white/30">
            Sidebar · sessions coming in step 2
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 items-center gap-2 border-b border-white/[0.06] px-4">
          <span className="text-sm text-white/80">
            {view === "chat" ? "Chat" : "Images"}
          </span>
          <span className="ml-auto font-mono text-[10px] text-white/25">
            ⌘K commands
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center text-sm text-white/30">
          {view === "chat" ? "Chat view" : "Image view"} — placeholder until
          steps 2–4
        </div>
      </main>

      <CommandPalette
        onNewChat={newChat}
        onSwitchChat={() => setView("chat")}
        onSwitchImages={() => setView("images")}
        onClearHistory={clearAll}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
    </div>
  );
}
