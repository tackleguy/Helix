import { getAppDownloadMeta } from "@/lib/app-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getAppDownloadMeta());
}
