import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { uid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ChatIndexPage() {
  const db = getDb();
  const row = db
    .select()
    .from(sessions)
    .where(eq(sessions.archived, false))
    .orderBy(desc(sessions.updatedAt))
    .limit(1)
    .get();

  if (row) {
    redirect(`/chat/${row.id}`);
  }

  const id = uid();
  const now = new Date();
  db.insert(sessions)
    .values({
      id,
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      archived: false,
    })
    .run();
  redirect(`/chat/${id}`);
}
