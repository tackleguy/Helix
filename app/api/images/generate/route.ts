import { parseJsonBody } from "@/lib/api";
import { GenerateImageSchema } from "@/lib/images/types";
import { generateImage } from "@/lib/images/generate";
import { logServer } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, GenerateImageSchema);
  if ("error" in parsed) return parsed.error;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      };

      try {
        send({ type: "meta", status: "started" });
        const input = GenerateImageSchema.parse(parsed.data);
        const image = await generateImage(input, (p) => {
          send({ type: "progress", value: p.value, max: p.max });
        });
        send({ type: "done", image });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "generation failed";
        logServer("error", "images generate failed", { error: msg });
        send({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
