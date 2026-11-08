import "server-only";
import { z } from "zod";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { requireSession } from "@/modules/identity/server/session";
import { serviceClient } from "@/infrastructure/supabase/server";
import { databaseError, rateLimit } from "@/shared/server/http";
import type { SubscriptionStatus } from "@/shared/types";

const schema = z
  .object({
    plan: z.enum(["free", "start", "business", "growth"]),
    extraBranches: z.number().int().min(0).max(2).default(0),
    idempotencyKey: z.string().trim().min(1).max(100),
    mode: z.enum(["sandbox", "paycell"]).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.extraBranches <=
      (v.plan === "business" ? 1 : v.plan === "start" ? 2 : 0),
  );

function getPaycellSigningSecret(): string | null {
  return (
    process.env.QR_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

/**
 * Paycell callback-inin mənbəyini yoxlayır. Açar yalnız Paycell panelindəki callback URL-də
 * saxlanılır, müştəriyə heç vaxt verilmir. order_id imzası ödənişi sübut etmir: onu server
 * ödənişdən əvvəl yaradıb müştəriyə verir.
 */
export function verifyPaycellWebhookKey(
  given: string | null,
): "ok" | "denied" | "not_configured" {
  const expected = process.env.PAYCELL_WEBHOOK_KEY;
  if (!expected) return "not_configured";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return given !== null && timingSafeEqual(digest(given), digest(expected))
    ? "ok"
    : "denied";
}

export function createPaycellOrderId(
  companyId: string,
  plan: "start" | "business" | "growth",
  extraBranches: number,
  nowMs = Date.now(),
): string {
  const secret = getPaycellSigningSecret();
  if (!secret) throw new Error("NOT_CONFIGURED");
  const ts = Math.floor(nowMs / 1000).toString(36);
  const payload = `${companyId}_${plan}_${extraBranches}_${ts}`;
  const sig = createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  return `sub_${payload}_${sig}`;
}

export function verifyPaycellOrderId(orderId: string): {
  companyId: string;
  plan: "start" | "business" | "growth";
  extraBranches: number;
} | null {
  const parts = orderId.split("_");
  if (parts[0] !== "sub" || parts.length !== 6) return null;
  const [, companyId, plan, extraStr, ts, sig] = parts;
  if (plan !== "start" && plan !== "business" && plan !== "growth") return null;
  const extraBranches = Number.parseInt(extraStr, 10);
  if (
    Number.isNaN(extraBranches) ||
    extraBranches < 0 ||
    extraBranches > 2 ||
    (plan === "business" && extraBranches > 1) ||
    (plan === "growth" && extraBranches > 0)
  ) {
    return null;
  }
  const issuedSec = Number.parseInt(ts, 36);
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    Number.isNaN(issuedSec) ||
    issuedSec <= 0 ||
    nowSec - issuedSec > 86400 ||
    issuedSec - nowSec > 300
  ) {
    return null;
  }
  const secret = getPaycellSigningSecret();
  if (!secret) return null;
  const payload = `${companyId}_${plan}_${extraBranches}_${ts}`;
  const expectedSig = createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  if (sig.length !== expectedSig.length) return null;
  const valid = timingSafeEqual(
    Buffer.from(sig, "utf-8"),
    Buffer.from(expectedSig, "utf-8"),
  );
  if (!valid) return null;
  return { companyId, plan, extraBranches };
}

export async function requireOwner() {
  const { client, user } = await requireSession();
  const { data: member, error } = await client
    .from("memberships")
    .select("company_id,role,display_name")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .is("plan_disabled_at", null)
    .maybeSingle();
  if (error) throw new Error("INTERNAL");
  if (!member || member.role !== "owner") throw new Error("FORBIDDEN");
  return {
    companyId: member.company_id as string,
    actorId: user.id,
    displayName:
      typeof (member as { display_name?: unknown }).display_name === "string"
        ? ((member as { display_name: string }).display_name.trim() || "Panelim")
        : "Panelim",
  };
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const { companyId } = await requireOwner();
  const { data, error } = await serviceClient().rpc("get_subscription_status", {
    p_company_id: companyId,
  });
  if (error) databaseError(error.message);
  if (!data) throw new Error("INTERNAL");
  return data as SubscriptionStatus;
}

export async function createPaycellCheckout(input: unknown, origin?: string) {
  const { companyId, displayName } = await requireOwner();
  const parsed = schema.safeParse(input);
  if (!parsed.success || parsed.data.plan === "free") {
    throw new Error("INVALID_INPUT");
  }
  // Callback açarı yoxdursa ödəniş abunəni aktivləşdirə bilməz: müştəridən pul alınmasın
  if (!process.env.PAYCELL_WEBHOOK_KEY) throw new Error("NOT_CONFIGURED");
  await rateLimit(`billing:${companyId}`, 20, 60);
  const { plan, extraBranches } = parsed.data;
  const amountAzn =
    plan === "start"
      ? 15 + extraBranches * 5
      : plan === "business"
        ? 29 + extraBranches * 5
        : 49;

  const orderId = createPaycellOrderId(companyId, plan, extraBranches);
  const descriptionText = `${plan.toUpperCase()} paketi${
    extraBranches > 0 ? ` (+${extraBranches} əlavə filial)` : ""
  }`;
  const tesvir = Buffer.from(descriptionText, "utf-8").toString("base64");
  const miqdar = Buffer.from("1 aylıq abunə", "utf-8").toString("base64");
  const baseOrigin =
    origin && (origin.startsWith("https://") || origin.startsWith("http://localhost"))
      ? origin.replace(/\/$/, "")
      : "https://panelim.az";
  const backurl = Buffer.from(
    `${baseOrigin}/rehber?payment=success&order_id=${encodeURIComponent(orderId)}`,
    "utf-8",
  ).toString("base64");

  const params = new URLSearchParams({
    site: "panelim.az",
    amount: String(amountAzn),
    order_id: orderId,
    nick: displayName,
    tesvir,
    miqdar,
    backurl,
  });

  return {
    ok: true,
    checkoutUrl: `https://paycell.az/pay/?${params.toString()}`,
    orderId,
    amountAzn,
  };
}
export async function processSandboxCheckout(input: unknown) {
  const { companyId, actorId } = await requireOwner();
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  // Production-da ödənişsiz yalnız Free-yə keçid olur; pullu paket yalnız Paycell callback-i ilə açılır
  if (parsed.data.plan !== "free" && process.env.NODE_ENV === "production") {
    throw new Error("FORBIDDEN");
  }
  await rateLimit(`billing:${companyId}`, 20, 60);
  const { plan, extraBranches, idempotencyKey } = parsed.data;
  const db = serviceClient();
  const amount =
    plan === "start"
      ? 1500 + extraBranches * 500
      : plan === "business"
        ? 2900 + extraBranches * 500
        : 4900;
  const { data, error } =
    plan === "free"
      ? await db.rpc("switch_to_free", {
          p_actor: actorId,
          p_company: companyId,
          p_key: idempotencyKey,
        })
      : await db.rpc("process_subscription_payment", {
          p_actor: actorId,
          p_company_id: companyId,
          p_plan: plan,
          p_amount_qepik: amount,
          p_extra_branches: extraBranches,
          p_idempotency_key: idempotencyKey,
          p_provider_tx_id: `sandbox-${randomUUID()}`,
        });
  if (error) databaseError(error.message);
  const result = z
    .object({
      success: z.literal(true),
      transaction_id: z.string(),
      idempotent: z.boolean(),
    })
    .safeParse(data);
  if (!result.success) throw new Error("INTERNAL");
  return {
    ok: true,
    success: true,
    transactionId: result.data.transaction_id,
    idempotent: result.data.idempotent,
  };
}
