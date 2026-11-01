import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { serviceClient } from "@/infrastructure/supabase/server";
import { errorMessages } from "@/shared/i18n/az";
const statusCodes: Record<string, number> = {
  NOT_CONFIGURED: 503,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  AUTH_FAILED: 401,
  ALREADY_EXISTS: 409,
  EMPLOYEE_LIMIT_REACHED: 409,
  BRANCH_LIMIT_REACHED: 409,
  PLAN_SELECTION_REQUIRED: 409,
  INTERNAL: 500,
};
export function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code =
    Object.keys(errorMessages).find((key) => key === message) ?? "INTERNAL";
  return NextResponse.json(
    { error: { code, message: errorMessages[code] } },
    {
      status: statusCodes[code] ?? 400,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
export function ok(data: unknown) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function readMutation(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;
  const isAllowedOrigin = origin && (origin === requestOrigin || (configuredOrigin && origin === configuredOrigin));
  if (
    !isAllowedOrigin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new Error("FORBIDDEN");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("INVALID_INPUT");
  if (Number(request.headers.get("content-length")) > 8192)
    throw new Error("INVALID_INPUT");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 8192) {
      await reader.cancel();
      throw new Error("INVALID_INPUT");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("INVALID_INPUT");
  }
}
export async function rateLimit(key: string, limit = 20, seconds = 60) {
  const hash = createHash("sha256").update(key).digest("hex");
  const { data, error } = await serviceClient().rpc("consume_rate_limit", {
    p_key: hash,
    p_limit: limit,
    p_window: seconds,
  });
  if (error) throw new Error("INTERNAL");
  if (!data) throw new Error("RATE_LIMITED");
}
export function databaseError(message: string): never {
  const code = Object.keys(errorMessages).find((key) => message === key);
  throw new Error(code ?? "INTERNAL");
}
