"use client";

import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  MessageSquarePlus,
  ImageIcon,
  Video,
  Bot,
  Brain,
  Mic,
  Settings,
  Trash2,
  PanelLeft,
} from "lucide-react";

export type CommandGroup = "Navigate" | "Actions" | "Settings";

export interface CommandDefinition {
  id: string;
  label: string;
  group: CommandGroup;
  icon: LucideIcon;
  keywords?: string[];
  href?: string;
  action?: string;
  destructive?: boolean;
}

/** Static command definitions — actions resolved at runtime via dispatch. */
export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: "nav-chat",
    label: "Go to Chat",
    group: "Navigate",
    icon: MessageSquare,
    href: "/chat",
    keywords: ["chat", "conversation"],
  },
  {
    id: "nav-images",
    label: "Go to Images",
    group: "Navigate",
    icon: ImageIcon,
    href: "/images",
    keywords: ["image", "studio", "generate"],
  },
  {
    id: "nav-video",
    label: "Go to Video",
    group: "Navigate",
    icon: Video,
    href: "/video",
  },
  {
    id: "nav-agents",
    label: "Go to Agents",
    group: "Navigate",
    icon: Bot,
    href: "/agents",
  },
  {
    id: "nav-memory",
    label: "Go to Memory",
    group: "Navigate",
    icon: Brain,
    href: "/memory",
    keywords: ["rag", "documents"],
  },
  {
    id: "nav-voice",
    label: "Go to Voice",
    group: "Navigate",
    icon: Mic,
    href: "/voice",
  },
  {
    id: "nav-settings",
    label: "Open Settings",
    group: "Navigate",
    icon: Settings,
    href: "/settings",
    keywords: ["preferences", "config"],
  },
  {
    id: "action-new-chat",
    label: "New chat",
    group: "Actions",
    icon: MessageSquarePlus,
    action: "new-chat",
    keywords: ["create", "session"],
  },
  {
    id: "action-clear-chats",
    label: "Clear all chats",
    group: "Actions",
    icon: Trash2,
    action: "clear-chats",
    destructive: true,
  },
  {
    id: "action-toggle-sidebar",
    label: "Toggle sidebar",
    group: "Actions",
    icon: PanelLeft,
    action: "toggle-sidebar",
  },
];

export function filterCommands(query: string): CommandDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMAND_DEFINITIONS;
  return COMMAND_DEFINITIONS.filter((cmd) => {
    const hay = [cmd.label, ...(cmd.keywords ?? [])].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
