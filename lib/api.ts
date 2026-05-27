import { z } from "zod";

export interface ApiErrorBody {
  error: string;
  code?: string;
}

export function apiError(
  error: string,
  status = 500,
  code?: string,
): Response {
  const body: ApiErrorBody = code ? { error, code } : { error };
  return Response.json(body, { status });
}

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: apiError("invalid json", 400, "INVALID_JSON") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      error: apiError(
        result.error.issues.map((i) => i.message).join("; "),
        400,
        "VALIDATION_ERROR",
      ),
    };
  }
  return { data: result.data };
}

export const NODE_ROUTE = {
  runtime: "nodejs" as const,
  dynamic: "force-dynamic" as const,
};
