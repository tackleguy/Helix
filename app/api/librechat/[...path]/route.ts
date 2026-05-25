/**
 * Catch-all proxy from Helix → LibreChat. Forwards the path verbatim,
 * preserves method/body/headers, copies Set-Cookie back so refresh tokens
 * land in the user's browser, and streams response bodies.
 *
 * Helix → LibreChat:
 *   /api/librechat/auth/login        → ${BASE}/api/auth/login
 *   /api/librechat/agents/chat       → ${BASE}/api/agents/chat
 *   /api/librechat/convos?limit=25   → ${BASE}/api/convos?limit=25
 */

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE = process.env.HELIX_LIBRECHAT_URL ?? "";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function proxy(req: NextRequest, path: string[]) {
  if (!BASE) {
    return Response.json(
      {
        error: "librechat_not_configured",
        hint: "set HELIX_LIBRECHAT_URL to your LibreChat backend (e.g. http://127.0.0.1:3080)",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const target = `${BASE.replace(/\/+$/, "")}/api/${path.join("/")}${url.search}`;

  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v);
  }
  headers.set("Accept-Encoding", "identity");

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      signal: req.signal,
    });
  } catch (err) {
    return Response.json(
      {
        error: "librechat_unreachable",
        url: target,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const respHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) respHeaders.set(k, v);
  }
  respHeaders.set("X-Helix-Proxy", "librechat");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}

