import "server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/modules/identity/server/session";
import { serviceClient } from "@/infrastructure/supabase/server";
import { databaseError, rateLimit } from "@/shared/server/http";
import type { SubscriptionStatus } from "@/shared/types";
const schema = z
  .object({
    plan: z.enum(["free", "start", "business", "growth"]),
    extraBranches: z.number().int().min(0).max(2).default(0),
    idempotencyKey: z.string().trim().min(1).max(100),
  })
  .strict()
  .refine(
    (v) =>
      v.extraBranches <=
      (v.plan === "business" ? 1 : v.plan === "start" ? 2 : 0),
  );
export async function requireOwner() {
  const { client, user } = await requireSession();
  const { data: member, error } = await client
    .from("memberships")
    .select("company_id,role")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .is("plan_disabled_at", null)
    .maybeSingle();
  if (error) throw new Error("INTERNAL");
  if (!member || member.role !== "owner") throw new Error("FORBIDDEN");
  return { companyId: member.company_id as string, actorId: user.id };
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
export async function processSandboxCheckout(input: unknown) {
  const { companyId, actorId } = await requireOwner();
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
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
