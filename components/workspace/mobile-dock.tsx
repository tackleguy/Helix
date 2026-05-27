"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  ImageIcon,
  Video,
  Bot,
  Brain,
  Mic,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOCK = [
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/images", icon: ImageIcon, label: "Images" },
  { href: "/video", icon: Video, label: "Video" },
  { href: "/agents", icon: Bot, label: "Agents" },
  { href: "/memory", icon: Brain, label: "Memory" },
  { href: "/voice", icon: Mic, label: "Voice" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

export function MobileDock() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-white/[0.06] bg-ink-900/95 px-1 py-1.5 backdrop-blur-xl md:hidden">
      {DOCK.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg transition duration-200",
              active ? "text-helix" : "text-white/40",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        );
      })}
    </nav>
  );
}
