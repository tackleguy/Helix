"use client";

import { Download, MessageSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ImageDto } from "@/lib/images/types";

interface ImageLightboxProps {
  image: ImageDto;
  onClose: () => void;
  onRemix: () => void;
}

export function ImageLightbox({ image, onClose, onRemix }: ImageLightboxProps) {
  const router = useRouter();
  let params: Record<string, unknown> = {};
  try {
    params = JSON.parse(image.paramsJson ?? "{}") as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-black/50 text-white/70 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.prompt}
          className="max-h-[60vh] w-full object-contain"
        />

        <div className="border-t border-white/[0.06] p-4">
          <p className="text-sm text-white/85">{image.prompt}</p>
          <p className="mt-1 font-mono text-[11px] text-white/35">
            {image.model ?? "unknown"} · seed{" "}
            {String(params.seed ?? "—")} · {image.createdAt ? new Date(image.createdAt).toLocaleString() : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionBtn icon={Download} label="Download" onClick={() => {
              const a = document.createElement("a");
              a.href = image.url;
              a.download = `helix-${image.id}.png`;
              a.click();
            }} />
            <ActionBtn icon={MessageSquare} label="Send to chat" onClick={() => {
              router.push(`/chat?image=${encodeURIComponent(image.url)}`);
            }} />
            <ActionBtn
              label="Remix"
              onClick={onRemix}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon?: typeof Download;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-white/60 transition hover:border-white/[0.12] hover:text-white/85"
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />}
      {label}
    </button>
  );
}
