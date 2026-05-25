"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  ImageIcon,
  Library,
  Hexagon,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DockActive = "dashboard" | "chat" | "images" | "prompts";

interface Props {
  active: DockActive;
}

const ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "chat", label: "Chat", href: "/chat", icon: MessageSquare },
  { id: "images", label: "Images", href: "/images", icon: ImageIcon },
  { id: "prompts", label: "Prompts", href: "/prompts", icon: Library },
] as const;

export function DockNav({ active }: Props) {
  return (
    <nav className="relative z-20 flex h-full w-[60px] flex-col items-center gap-1 border-r border-line-subtle bg-bg-subtle/80 py-3 backdrop-blur-xl">
      <Link
        href="/"
        className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent/40 shadow-glow"
        aria-label="Helix home"
      >
        <Hexagon className="h-4 w-4 text-white" strokeWidth={2.5} />
      </Link>
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = it.id === active;
        return (
          <Link
            key={it.id}
            href={it.href}
            title={it.label}
            className={cn(
              "group relative grid h-10 w-10 place-items-center rounded-xl transition",
              isActive
                ? "bg-bg-elevated text-fg"
                : "text-fg-subtle hover:bg-bg-elevated hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" />
            <span
              className={cn(
                "pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-bg-elevated px-2 py-1 text-[11px] text-fg opacity-0 shadow-panel transition group-hover:opacity-100",
              )}
            >
              {it.label}
            </span>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent" />
            )}
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <Link
          href="/login"
          title="Sign in (LibreChat)"
          className="grid h-10 w-10 place-items-center rounded-xl text-fg-subtle transition hover:bg-bg-elevated hover:text-fg"
        >
          <SettingsIcon className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}
