import { apiError } from "@/lib/api";
import { getAllServiceHealth } from "@/lib/services/registry";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const services = await getAllServiceHealth(force);
    return Response.json({ services, cached: !force });
  } catch (err) {
    logServer("error", "services/status failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError("failed to check services", 500, "SERVICE_CHECK_FAILED");
  }
}
