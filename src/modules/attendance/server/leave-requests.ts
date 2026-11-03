import "server-only";
import { z } from "zod";
import { requireSession } from "@/modules/identity/server/session";
import { serviceClient } from "@/infrastructure/supabase/server";
import { databaseError, rateLimit } from "@/shared/server/http";

const requestSchema = z
  .object({
    type: z.enum(["leave", "permission"]),
    startsOn: z.iso.date().optional(),
    endsOn: z.iso.date().optional(),
    start: z.iso.date().optional(),
    end: z.iso.date().optional(),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict()
  .transform((val) => {
    const startsOn = val.startsOn || val.start;
    const endsOn = val.endsOn || val.end;
    if (!startsOn || !endsOn) throw new Error("INVALID_INPUT");
    return { type: val.type, startsOn, endsOn, reason: val.reason };
  });

const decisionSchema = z
  .object({
    id: z.uuid().optional(),
    requestId: z.uuid().optional(),
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().min(3).max(1000),
  })
  .strict()
  .transform((val) => {
    const id = val.id || val.requestId;
    if (!id) throw new Error("INVALID_INPUT");
    return { id, decision: val.decision, reason: val.reason };
  });

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
