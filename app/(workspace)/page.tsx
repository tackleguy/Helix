import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { uid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function WorkspaceHome() {
  if (process.env.VERCEL === "1") {
    redirect("/chat");
  }

  const db = getDb();
  const existing = db.select().from(sessions).limit(1).get();
  if (existing) {
    redirect(`/chat/${existing.id}`);
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
