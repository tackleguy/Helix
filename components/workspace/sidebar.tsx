"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  ImageIcon,
  Video,
  Bot,
  Brain,
  GraduationCap,
  Mic,
  Settings,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";
import { ChatSessionList } from "@/components/chat/session-list";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/study", label: "Study", icon: GraduationCap },
  { href: "/images", label: "Images", icon: ImageIcon },
  { href: "/video", label: "Video", icon: Video },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/voice", label: "Voice", icon: Mic },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { setSidebarOpen } = useWorkspace();
  const onChat = pathname.startsWith("/chat");

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-white/[0.06] bg-ink-900/90">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <Link href="/chat" className="wordmark text-lg text-white/90">
          Helix
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="grid h-7 w-7 place-items-center rounded-md text-white/35 transition hover:bg-white/[0.04] hover:text-white/70"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="space-y-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition duration-200",
                active
                  ? "border-l-2 border-helix bg-white/[0.04] pl-[calc(0.625rem-2px)] text-white"
                  : "border-l-2 border-transparent text-white/50 hover:bg-white/[0.03] hover:text-white/80",
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {onChat && <ChatSessionList />}

      <div className="mt-auto border-t border-white/[0.06] px-3 py-2.5">
        <p className="text-[10px] text-white/25">Local-first · v0.5</p>
      </div>
    </aside>
  );
}
