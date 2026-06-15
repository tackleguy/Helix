import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { apiError } from "@/lib/api";
import {
  getAppDownloadRedirectUrl,
  getLocalAppZipPath,
  HELIX_APP_ZIP_NAME,
} from "@/lib/app-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const localPath = getLocalAppZipPath();
  if (localPath) {
    const stat = statSync(localPath);
    const stream = createReadStream(localPath);
    const body = Readable.toWeb(stream) as ReadableStream;
    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${HELIX_APP_ZIP_NAME}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "no-cache",
      },
    });
  }

  const redirect = getAppDownloadRedirectUrl();
  if (redirect) {
    return Response.redirect(redirect, 302);
  }

  return apiError("app download not available", 404);
}
