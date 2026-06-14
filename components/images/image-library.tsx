"use client";

import type { ImageDto } from "@/lib/images/types";

interface ImageLibraryProps {
  images: ImageDto[];
  onSelect: (image: ImageDto) => void;
  onRemix: (image: ImageDto) => void;
}

export function ImageLibrary({
  images,
  onSelect,
  onRemix,
}: ImageLibraryProps) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {images.map((img) => (
        <div
          key={img.id}
          className="group relative mb-3 break-inside-avoid overflow-hidden rounded-lg border border-white/[0.06] bg-ink-900"
        >
          <button
            type="button"
            className="block w-full"
            onClick={() => onSelect(img)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.prompt}
              className="w-full object-cover transition duration-200 group-hover:opacity-90"
              loading="lazy"
            />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
            <p className="line-clamp-2 text-[10px] text-white/75">{img.prompt}</p>
            <button
              type="button"
              className="mt-1 text-[10px] text-helix hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onRemix(img);
              }}
            >
              Remix
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
