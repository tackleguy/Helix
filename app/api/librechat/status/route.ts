/**
 * Health probe for the configured LibreChat backend. UI uses it to know
 * whether to expose LibreChat-only features (login, conversation sync).
 */

export const runtime = "nodejs";

const BASE = process.env.HELIX_LIBRECHAT_URL ?? "";

export async function GET() {
  if (!BASE) {
    return Response.json({
      configured: false,
      reachable: false,
      baseUrl: null,
    });
  }
  try {
    const r = await fetch(`${BASE.replace(/\/+$/, "")}/api/config`, {
      signal: AbortSignal.timeout(2_000),
    });
    return Response.json({
      configured: true,
      reachable: r.ok,
      status: r.status,
      baseUrl: BASE,
    });
  } catch (err) {
    return Response.json({
      configured: true,
      reachable: false,
      baseUrl: BASE,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
