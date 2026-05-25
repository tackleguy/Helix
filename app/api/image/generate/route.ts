import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BACKEND_URL = process.env.HELIX_BACKEND_URL ?? "http://127.0.0.1:8000";

interface GenerateBody {
  prompt?: unknown;
  negative_prompt?: unknown;
  width?: unknown;
  height?: unknown;
  seed?: unknown;
}

export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const payload = {
    prompt,
    negative_prompt:
      typeof body.negative_prompt === "string" ? body.negative_prompt : null,
    width: clampInt(body.width, 1024, 64, 2048),
    height: clampInt(body.height, 1024, 64, 2048),
    seed: typeof body.seed === "number" ? body.seed : null,
  };

  try {
    const upstream = await fetch(`${BACKEND_URL}/image/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55_000),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    const data = (await upstream.json()) as { url: string };
    // Rewrite backend-relative URL to our proxy so the browser can fetch it.
    return Response.json({
      ...data,
      url: `/api/image${data.url.replace(/^\/image/, "")}`,
    });
  } catch (err) {
    return Response.json(
      {
        error: "backend_unreachable",
        detail:
          err instanceof Error
            ? err.message
            : "could not reach Helix backend at " + BACKEND_URL,
        hint: "start it with: cd backend && uvicorn app.main:app --reload",
      },
      { status: 502 },
    );
  }
}

function clampInt(v: unknown, fallback: number, lo: number, hi: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
