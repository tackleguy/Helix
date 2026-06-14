import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { apiError } from "@/lib/api";
import { HELIX_IMAGES_DIR } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-z0-9]+$/i.test(id)) {
    return apiError("invalid image id", 400);
  }

  const path = join(HELIX_IMAGES_DIR, `${id}.png`);
  if (!existsSync(path)) {
    return apiError("image not found", 404);
  }

  const buffer = readFileSync(path);
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
