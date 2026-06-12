"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCloudMode } from "@/lib/chat/cloud-mode-context";

interface BackendModels {
  backend: string;
  online: boolean;
  models: Array<{ id: string }>;
}

export function ServicesBanner() {
  const { onCloud, ready, cloudChat, huggingface, openai, defaultModel } =
    useCloudMode();
  const [modelsOnline, setModelsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const load = async () => {
      try {
        if (onCloud) {
          const res = await fetch("/api/models", { cache: "no-store" });
          if (!cancelled && res.ok) {
            const data = (await res.json()) as { backends: BackendModels[] };
            setModelsOnline((data.backends ?? []).some((b) => b.online));
          } else if (!cancelled) {
            setModelsOnline(cloudChat);
          }
          return;
        }

        const res = await fetch("/api/services/status", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as {
            services: Array<{ id: string; online: boolean }>;
          };
          const chatIds = new Set(["llama-server", "lmstudio", "ollama"]);
          setModelsOnline(
            data.services.some((s) => chatIds.has(s.id) && s.online),
          );
        } else if (!cancelled) {
          setModelsOnline(false);
        }
      } catch {
        if (!cancelled) setModelsOnline(onCloud ? cloudChat : false);
      }
    };

    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [ready, onCloud, cloudChat]);

  if (!ready) return null;

  if (onCloud && cloudChat && (modelsOnline || defaultModel)) {
    return (
      <div className="flex items-start gap-2 border-b border-helix/15 bg-helix/5 px-4 py-2.5 text-xs text-helix/90">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Cloud AI ready</p>
          <p className="mt-0.5 text-helix/70">
            Model:{" "}
            <span className="font-mono text-helix/90">
              {defaultModel ?? "configured"}
            </span>
            {huggingface ? " via Hugging Face" : openai ? " via OpenAI" : ""}
          </p>
        </div>
      </div>
    );
  }

  if (onCloud && !cloudChat) {
    return (
      <div className="flex items-start gap-2 border-b border-violet-400/15 bg-violet-400/5 px-4 py-2.5 text-xs text-violet-100/90">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-300/80" />
        <div>
          <p className="font-medium">Cloud AI not configured</p>
          <p className="mt-0.5 text-violet-100/60">
            Add{" "}
            <span className="font-mono text-violet-100/75">HF_API_KEY</span> in
            Vercel → Project → Settings → Environment Variables (Production +
            Preview), then redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (!onCloud && modelsOnline === false) {
    return (
      <div className="flex items-start gap-2 border-b border-amber-400/15 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-100/90">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-300/80" />
        <div>
          <p className="font-medium">No chat backend detected</p>
          <p className="mt-0.5 text-amber-100/60">
            Start{" "}
            <span className="font-mono text-amber-100/75">ollama serve</span>, LM
            Studio (port 1234), or llama-server (port 8080). Or set{" "}
            <span className="font-mono text-amber-100/75">HF_API_KEY</span> in{" "}
            <code className="font-mono text-[10px]">.env.local</code>. Check{" "}
            <Link href="/settings" className="underline hover:text-white">
              Settings → Services
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return null;
}
