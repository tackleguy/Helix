import { ChatView } from "@/components/chat/chat-view";

export const dynamic = "force-dynamic";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatView sessionId={id} />;
}
