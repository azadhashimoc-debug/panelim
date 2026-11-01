import "server-only";
import { z } from "zod";
import { requireOwner } from "./billing";
import { serviceClient } from "@/infrastructure/supabase/server";
import { databaseError, rateLimit } from "@/shared/server/http";
import type { FreeSelectionOptions, SubscriptionStatus } from "@/shared/types";

const schema = z.object({
  memberIds: z.array(z.uuid()).min(1).max(3).refine(ids => new Set(ids).size === ids.length),
  branchId: z.uuid(),
  idempotencyKey: z.string().trim().min(1).max(100),
}).strict();

export async function fetchFreeSelectionOptions(): Promise<FreeSelectionOptions> {
  const { companyId, actorId } = await requireOwner();
  const db = serviceClient();
  const { data: status, error } = await db.rpc("get_subscription_status", { p_company_id: companyId });
  if (error) databaseError(error.message);
  if (!status) throw new Error("INTERNAL");
  const [members, branches] = await Promise.all([
    db.from("memberships").select("id,user_id,display_name,role").eq("company_id", companyId).is("archived_at", null).is("plan_disabled_at", null).order("display_name"),
    db.from("branches").select("id,name").eq("company_id", companyId).is("archived_at", null).is("plan_disabled_at", null).order("name"),
  ]);
  if (members.error || branches.error || !members.data || !branches.data) throw new Error("INTERNAL");
  const owner = members.data.find(member => member.user_id === actorId);
  if (!owner) throw new Error("FORBIDDEN");
  return {
    status: status as SubscriptionStatus,
    ownerMembershipId: owner.id,
    members: members.data.map(({ id, display_name, role }) => ({ id, display_name, role })),
    branches: branches.data,
  };
}

export async function completeFreeSelection(input: unknown) {
  const { companyId, actorId } = await requireOwner();
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  await rateLimit(`selection:${companyId}`, 20, 60);
  const { data, error } = await serviceClient().rpc("complete_free_selection", {
    p_actor: actorId, p_company: companyId, p_members: parsed.data.memberIds,
    p_branch: parsed.data.branchId, p_key: parsed.data.idempotencyKey,
  });
  if (error) databaseError(error.message);
  const result = z.object({ success: z.literal(true), idempotent: z.boolean() }).safeParse(data);
  if (!result.success) throw new Error("INTERNAL");
  return { ok: true, ...result.data };
}
