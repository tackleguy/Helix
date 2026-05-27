import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChatPlaceholder } from "@/components/workspace/chat-placeholder";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();

  if (!session) notFound();

  return <ChatPlaceholder title={session.title} />;
}
