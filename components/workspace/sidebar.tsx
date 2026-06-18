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
import { DownloadAppButton } from "@/components/workspace/download-app-button";
import { useCloudMode } from "@/lib/chat/cloud-mode-context";
import { HELIX_CLOUD_URL } from "@/lib/site";

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
  const { onCloud, ready } = useCloudMode();
  const onChat = pathname.startsWith("/chat");

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-white/[0.06] bg-ink-900/90">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Link
            href={onCloud ? "/" : "/chat"}
            className="wordmark text-lg text-white/90"
          >
            Helix
          </Link>
          {ready && onCloud && (
            <span className="rounded bg-helix/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-helix">
              Cloud
            </span>
          )}
        </div>
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

      <div className="mt-auto border-t border-white/[0.06] px-3 py-2.5 space-y-2">
        {ready && onCloud && <DownloadAppButton />}
        {ready && !onCloud && (
          <a
            href={HELIX_CLOUD_URL}
            className="block text-[10px] text-white/35 hover:text-helix"
          >
            Cloud site →
          </a>
        )}
        <p className="text-[10px] text-white/25">
          {onCloud ? "Cloud · " : "Local · "}v0.5
        </p>
      </div>
    </aside>
  );
}
