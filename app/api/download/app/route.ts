import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { apiError } from "@/lib/api";
import {
  getAppDownloadRedirectUrl,
  getServeableAppZipPath,
  HELIX_APP_ZIP_NAME,
} from "@/lib/app-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = getServeableAppZipPath();
  if (filePath) {
    const stat = statSync(filePath);
    const stream = createReadStream(filePath);
    const body = Readable.toWeb(stream) as ReadableStream;
    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${HELIX_APP_ZIP_NAME}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const redirect = getAppDownloadRedirectUrl();
  if (redirect) {
    return Response.redirect(redirect, 302);
  }

  return apiError("app download not available", 404);
}
