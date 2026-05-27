"use client";

import { MessageSquare } from "lucide-react";
import { TopBar } from "@/components/workspace/layout";
import { EmptyView } from "@/components/shared/ui";

interface ChatPlaceholderProps {
  title: string;
}

export function ChatPlaceholder({ title }: ChatPlaceholderProps) {
  return (
    <>
      <TopBar title={title} />
      <EmptyView
        icon={MessageSquare}
        title="Chat coming in Phase 2"
        description="Session is stored in ~/.helix/helix.db. Streaming, markdown, and slash commands arrive next."
      />
    </>
  );
}
