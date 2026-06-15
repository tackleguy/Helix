"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadInfo {
  available: boolean;
  ready: boolean;
  filename: string;
  platform: string;
  sizeHint: string;
  downloadUrl: string;
  message?: string | null;
}

interface DownloadAppButtonProps {
  variant?: "sidebar" | "card";
  className?: string;
}

export function DownloadAppButton({
  variant = "sidebar",
  className,
}: DownloadAppButtonProps) {
  const [info, setInfo] = useState<DownloadInfo | null>(null);

  useEffect(() => {
    fetch("/api/download/info", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d as DownloadInfo | null))
      .catch(() => setInfo(null));
  }, []);

  if (!info) {
    return (
      <div className={cn("flex items-center gap-2 px-2 py-1.5 text-xs text-white/30", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Checking download…</span>
      </div>
    );
  }

  if (!info.available) {
    return null;
  }

  const href = info.downloadUrl;
  const disabled = !info.ready && Boolean(info.message);

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-lg border border-white/[0.06] bg-white/[0.02] p-4",
          className,
        )}
      >
        <h3 className="text-sm font-medium text-white/85">Download Helix</h3>
        <p className="mt-1 text-xs text-white/40">
          Local macOS app with offline chat and image generation. {info.sizeHint}
        </p>
        <p className="mt-1 text-[11px] text-white/30">{info.platform}</p>
        {info.message && (
          <p className="mt-2 text-[11px] text-amber-200/70">{info.message}</p>
        )}
        <a
          href={href}
          download={info.ready ? info.filename : undefined}
          className={cn(
            "mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
            info.ready
              ? "bg-helix text-ink-900 hover:brightness-110"
              : "border border-white/[0.08] text-white/50 hover:text-white/70",
          )}
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          {info.ready ? `Download ${info.filename}` : "GitHub Releases"}
        </a>
      </div>
    );
  }

  return (
    <a
      href={href}
      download={info.ready ? info.filename : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition",
        info.ready
          ? "text-white/45 hover:bg-white/[0.04] hover:text-helix"
          : "text-white/35 hover:text-white/55",
        className,
      )}
      title={info.message ?? undefined}
    >
      <Download className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
      <span>{info.ready ? "Download app" : "Get app (GitHub)"}</span>
    </a>
  );
}
