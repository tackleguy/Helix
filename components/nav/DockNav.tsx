"use client";

import Link from "next/link";
import { MessageSquare, ImageIcon, Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  active: "chat" | "images";
}

const ITEMS = [
  { id: "chat", label: "Chat", href: "/", icon: MessageSquare },
  { id: "images", label: "Images", href: "/images", icon: ImageIcon },
] as const;

export function DockNav({ active }: Props) {
  return (
    <nav className="relative z-20 flex h-full w-[56px] flex-col items-center gap-1 border-r border-line-subtle bg-bg-subtle/80 py-3 backdrop-blur-xl">
      <Link
        href="/"
        className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent/40 shadow-glow"
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
              "group relative grid h-10 w-10 place-items-center rounded-lg transition",
              isActive
                ? "bg-bg-elevated text-fg"
                : "text-fg-subtle hover:bg-bg-elevated hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" />
            <span
              className={cn(
                "absolute left-full ml-2 whitespace-nowrap rounded-md bg-bg-elevated px-2 py-1 text-[11px] text-fg opacity-0 shadow-panel transition group-hover:opacity-100",
                "pointer-events-none",
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
    </nav>
  );
}
