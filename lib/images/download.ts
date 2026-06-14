import type { ImageDto } from "./types";

export async function downloadImageFile(image: ImageDto) {
  const filename = `helix-${image.id}.png`;

  if (image.url.startsWith("data:image/")) {
    const a = document.createElement("a");
    a.href = image.url;
    a.download = filename;
    a.click();
    return;
  }

  const res = await fetch(image.url);
  if (!res.ok) throw new Error("failed to download image");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
