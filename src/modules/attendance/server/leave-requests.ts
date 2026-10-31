import "server-only";
import { z } from "zod";
import { requireSession } from "@/modules/identity/server/session";
import { serviceClient } from "@/infrastructure/supabase/server";
import { databaseError, rateLimit } from "@/shared/server/http";

const requestSchema = z
  .object({
    type: z.enum(["leave", "permission"]),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
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

export async function requestLeave(input: unknown) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const { user } = await requireSession();
  await rateLimit(`leave:${user.id}`, 10, 3600);
  const { data, error } = await serviceClient().rpc("request_leave", {
    p_actor: user.id,
    p_type: parsed.data.type,
    p_start: parsed.data.startsOn,
    p_end: parsed.data.endsOn,
    p_reason: parsed.data.reason,
  });
  if (error) databaseError(error.message);
  return { id: data };
}

export async function decideLeave(input: unknown) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const { user } = await requireSession();
  await rateLimit(`leave_decision:${user.id}`, 30);
  const { data, error } = await serviceClient().rpc("decide_leave", {
    p_actor: user.id,
    p_id: parsed.data.id,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason,
  });
  if (error) databaseError(error.message);
  return { id: data };
}
