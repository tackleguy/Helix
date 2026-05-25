import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const BACKEND_URL = process.env.HELIX_BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Defense in depth — backend also rejects, but don't proxy obvious bad ids.
  if (!/^[A-Za-z0-9._-]+$/.test(id)) {
    return new Response("invalid id", { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/image/${id}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("image not found", { status: upstream.status });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response("backend unreachable", { status: 502 });
  }
}
