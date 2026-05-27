"use client";

import {
  MessageSquare,
  ImageIcon,
  Video,
  Bot,
  Brain,
  Mic,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "./layout";
import { EmptyView } from "@/components/shared/ui";

const ICONS = {
  chat: MessageSquare,
  images: ImageIcon,
  video: Video,
  agents: Bot,
  memory: Brain,
  voice: Mic,
} as const satisfies Record<string, LucideIcon>;

export type PlaceholderIcon = keyof typeof ICONS;

interface PlaceholderPageProps {
  icon: PlaceholderIcon;
  barTitle: string;
  title: string;
  description: string;
}

export function PlaceholderPage({
  icon,
  barTitle,
  title,
  description,
}: PlaceholderPageProps) {
  const Icon = ICONS[icon];
  return (
    <>
      <TopBar title={barTitle} />
      <EmptyView icon={Icon} title={title} description={description} />
    </>
  );
}
