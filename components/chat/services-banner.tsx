"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import type { ServiceHealth } from "@/lib/services/types";

const CHAT_IDS = new Set(["llama-server", "lmstudio", "ollama"]);

function isVercelHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.includes("vercel.app");
}

export function ServicesBanner() {
  const [chatOnline, setChatOnline] = useState<boolean | null>(null);
  const onVercel = isVercelHost();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/services/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d?.services) return;
          const services = d.services as ServiceHealth[];
          setChatOnline(
            services.some((s) => CHAT_IDS.has(s.id) && s.online),
          );
        })
        .catch(() => {
          if (!cancelled) setChatOnline(false);
        });
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (onVercel && chatOnline !== true) {
    return (
      <div className="flex items-start gap-2 border-b border-violet-400/15 bg-violet-400/5 px-4 py-2.5 text-xs text-violet-100/90">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-300/80" />
        <div>
          <p className="font-medium">Cloud demo — local models unavailable here</p>
          <p className="mt-0.5 text-violet-100/60">
            This Vercel deploy cannot reach Ollama/LM Studio on your computer.
            For full local chat run{" "}
            <span className="font-mono text-violet-100/75">npm run dev</span>{" "}
            locally,             or add{" "}
            <span className="font-mono text-violet-100/75">HF_API_KEY</span>{" "}
            (or <span className="font-mono text-violet-100/75">OPENAI_API_KEY</span>)
            in Vercel env settings for cloud chat.
          </p>
        </div>
      </div>
    );
  }

  if (chatOnline !== false) return null;

  return (
    <div className="flex items-start gap-2 border-b border-amber-400/15 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-100/90">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-300/80" />
      <div>
        <p className="font-medium">No chat backend detected</p>
        <p className="mt-0.5 text-amber-100/60">
          Start{" "}
          <span className="font-mono text-amber-100/75">ollama serve</span>, LM
          Studio (port 1234), or llama-server (port 8080). Then verify in{" "}
          <Link href="/settings" className="underline hover:text-white">
            Settings → Services
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
