"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadInfo {
  available: boolean;
  filename: string;
  platform: string;
  sizeHint: string;
  downloadUrl: string;
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

  if (!info?.available) return null;

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
        <a
          href="/api/download/app"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-helix px-3 py-2 text-sm font-medium text-ink-900 transition hover:brightness-110"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Download {info.filename}
        </a>
      </div>
    );
  }

  return (
    <a
      href="/api/download/app"
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/45 transition hover:bg-white/[0.04] hover:text-helix",
        className,
      )}
    >
      <Download className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
      <span>Download app</span>
    </a>
  );
}
