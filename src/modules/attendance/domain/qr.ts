import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
const payloadSchema = z.object({
  branch: z.uuid(),
  iat: z.number().int(),
  exp: z.number().int(),
});
const signature = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");
export function signQr(
  branch: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (secret.length < 32) throw new Error("NOT_CONFIGURED");
  const payload = Buffer.from(
    JSON.stringify({ branch, iat: now, exp: now + 120 }),
  ).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}
export function verifyQr(
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  try {
    if (secret.length < 32 || token.length > 1024) throw new Error();
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra !== undefined) throw new Error();
    const expected = Buffer.from(signature(payload, secret));
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new Error();
    const value = payloadSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString()),
    );
    if (value.exp <= now || value.iat > now || value.exp - value.iat !== 120)
      throw new Error();
    return value.branch;
  } catch {
    throw new Error("INVALID_QR");
  }
}
