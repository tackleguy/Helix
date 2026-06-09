"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { detectCloudClient, isCloudClient } from "@/lib/chat/cloud-client";

interface CloudStatus {
  cloudChat: boolean;
  huggingface: boolean;
  openai: boolean;
  defaultModel: string | null;
}

interface BackendModels {
  backend: string;
  online: boolean;
  models: Array<{ id: string }>;
  error?: string;
}

export function ServicesBanner() {
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [localOnline, setLocalOnline] = useState<boolean | null>(null);
  const [onCloud, setOnCloud] = useState(isCloudClient());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const cloud = isCloudClient() || (await detectCloudClient());
      if (!cancelled) setOnCloud(cloud);
      try {
        const [cloudRes, modelsRes, servicesRes] = await Promise.all([
          fetch("/api/cloud-status", { cache: "no-store" }),
          fetch("/api/models", { cache: "no-store" }),
          cloud
            ? Promise.resolve(null)
            : fetch("/api/services/status", { cache: "no-store" }),
        ]);

        if (!cancelled && cloudRes.ok) {
          setCloud((await cloudRes.json()) as CloudStatus);
        }

        if (!cancelled && modelsRes.ok) {
          const data = (await modelsRes.json()) as { backends: BackendModels[] };
          const anyOnline = (data.backends ?? []).some((b) => b.online);
          if (cloud) {
            setLocalOnline(anyOnline);
          }
        }

        if (!cancelled && servicesRes?.ok) {
          const data = (await servicesRes.json()) as {
            services: Array<{ id: string; online: boolean }>;
          };
          const chatIds = new Set(["llama-server", "lmstudio", "ollama"]);
          setLocalOnline(
            data.services.some((s) => chatIds.has(s.id) && s.online),
          );
        }
      } catch {
        if (!cancelled) setLocalOnline(false);
      }
    };
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (onCloud && cloud?.cloudChat && localOnline) {
    return (
      <div className="flex items-start gap-2 border-b border-helix/15 bg-helix/5 px-4 py-2.5 text-xs text-helix/90">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Cloud AI ready</p>
          <p className="mt-0.5 text-helix/70">
            Model:{" "}
            <span className="font-mono text-helix/90">
              {cloud.defaultModel ?? "configured"}
            </span>
            {cloud.huggingface ? " via Hugging Face" : " via OpenAI"}
          </p>
        </div>
      </div>
    );
  }

  if (onCloud && !cloud?.cloudChat) {
    return (
      <div className="flex items-start gap-2 border-b border-violet-400/15 bg-violet-400/5 px-4 py-2.5 text-xs text-violet-100/90">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-300/80" />
        <div>
          <p className="font-medium">Cloud AI not configured</p>
          <p className="mt-0.5 text-violet-100/60">
            Add{" "}
            <span className="font-mono text-violet-100/75">HF_API_KEY</span> in
            Vercel → Project → Settings → Environment Variables, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (localOnline === false && !cloud?.cloudChat) {
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
