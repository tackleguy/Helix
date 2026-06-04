"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";

export default function StudyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const res = await fetch("/api/study/session", { method: "POST" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const { session } = (await res.json()) as { session: { id: string } };
        if (!cancelled) router.replace(`/chat/${session.id}`);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not start study session");
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <GraduationCap className="h-8 w-8 text-helix/80" strokeWidth={1.5} />
      <p className="text-sm text-white/55">
        {error ?? "Starting Study Helix…"}
      </p>
      {error && (
        <p className="max-w-md text-xs text-white/35">
          Run{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono">
            ./scripts/build-study-model.sh
          </code>{" "}
          then{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono">
            ./scripts/serve-llama.sh study-helix
          </code>
        </p>
      )}
    </div>
  );
}
