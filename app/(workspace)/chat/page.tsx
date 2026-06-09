"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { detectCloudClient, isCloudClient } from "@/lib/chat/cloud-client";
import {
  createVercelSession,
  listVercelSessions,
} from "@/lib/chat/vercel-client-store";

export default function ChatIndexPage() {
  const router = useRouter();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setStuck(true);
    }, 8000);

    async function boot() {
      try {
        const cloud = isCloudClient() || (await detectCloudClient());
        if (cloud) {
          const existing = listVercelSessions()[0];
          if (existing && !cancelled) {
            router.replace(`/chat/${existing.id}`);
            return;
          }
          const session = createVercelSession();
          if (!cancelled) router.replace(`/chat/${session.id}`);
          return;
        }

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
        if (!cancelled) {
          const cloud = isCloudClient() || (await detectCloudClient());
          if (cloud) {
            const session = createVercelSession();
            router.replace(`/chat/${session.id}`);
          }
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  if (stuck) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/45">
        <p>Still loading chat…</p>
        <p className="max-w-sm text-xs text-white/30">
          Open{" "}
          <a href="/chat" className="text-helix underline">
            /chat
          </a>{" "}
          in Chrome or Safari, or hard-refresh (Cmd+Shift+R).
        </p>
        <button
          type="button"
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.04]"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-white/35">
      Loading chat…
    </div>
  );
}
