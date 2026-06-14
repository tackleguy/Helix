import { apiError } from "@/lib/api";
import { listImages } from "@/lib/images/repository";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Number(searchParams.get("limit") ?? "48"),
      100,
    );
    const before = searchParams.get("before");
    const images = listImages(
      limit,
      before ? Number(before) : undefined,
    );
    const nextCursor =
      images.length === limit
        ? images[images.length - 1]?.createdAt
        : null;
    return Response.json({ images, nextCursor });
  } catch (err) {
    logServer("error", "images library GET failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to list images", 500);
  }
}
