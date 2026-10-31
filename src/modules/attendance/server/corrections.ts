import "server-only";
import { z } from "zod";
import { requireBranchAccess } from "@/modules/organization/server/access";
import { requireSession } from "@/modules/identity/server/session";
import { serviceClient } from "@/infrastructure/supabase/server";
import { databaseError, rateLimit } from "@/shared/server/http";
const requestSchema = z
  .object({
    branchId: z.uuid(),
    attendanceId: z.uuid().nullable(),
    requestedIn: z.iso.datetime({ offset: true }),
    requestedOut: z.iso.datetime({ offset: true }).nullable(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
const decisionSchema = z
  .object({
    id: z.uuid(),
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export async function requestCorrection(input: unknown) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const value = parsed.data;
  const { user } = await requireBranchAccess(value.branchId);
  await rateLimit(`correction:${user.id}`, 8, 3600);
  const { data, error } = await serviceClient().rpc("request_correction", {
    p_actor: user.id,
    p_branch: value.branchId,
    p_attendance: value.attendanceId,
    p_in: value.requestedIn,
    p_out: value.requestedOut,
    p_reason: value.reason,
  });
  if (error) databaseError(error.message);
  return { id: data };
}
export async function decideCorrection(input: unknown) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const { client, user } = await requireSession();
  const { data: correction } = await client
    .from("corrections")
    .select("branch_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!correction) throw new Error("FORBIDDEN");
  await requireBranchAccess(correction.branch_id, "manage");
  await rateLimit(`decision:${user.id}`, 30);
  const { data, error } = await serviceClient().rpc("decide_correction", {
    p_actor: user.id,
    p_id: parsed.data.id,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason,
  });
  if (error) databaseError(error.message);
  return { id: data };
}
