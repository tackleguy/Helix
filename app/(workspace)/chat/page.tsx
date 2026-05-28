"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatIndexPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const listRes = await fetch("/api/chat/sessions", { cache: "no-store" });
        if (listRes.ok) {
          const data = (await listRes.json()) as {
            sessions: Array<{ id: string }>;
          };
          const existing = data.sessions[0];
          if (existing && !cancelled) {
            router.replace(`/chat/${existing.id}`);
            return;
          }
        }

        const createRes = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!createRes.ok) throw new Error("failed to create session");
        const { session } = (await createRes.json()) as {
          session: { id: string };
        };
        if (!cancelled) router.replace(`/chat/${session.id}`);
      } catch {
        if (!cancelled) router.replace("/");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-white/35">
      Loading chat…
    </div>
  );
}
