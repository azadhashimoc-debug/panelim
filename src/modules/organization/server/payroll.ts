import "server-only";
import { z } from "zod";
import { requireSession } from "@/modules/identity/server/session";
import { serviceClient } from "@/infrastructure/supabase/server";
import { databaseError, rateLimit } from "@/shared/server/http";

const advanceSchema = z
  .object({
    membershipId: z.uuid(),
    amountQepik: z.number().int().positive(),
    issuedOn: z.iso.date(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const closePeriodSchema = z
  .object({
    membershipId: z.uuid(),
    periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
    overtimeQepik: z.number().int().nonnegative().default(0),
  })
  .strict();

export async function recordSalaryAdvance(input: unknown) {
  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const { user } = await requireSession();
  await rateLimit(`advance:${user.id}`, 20);

  const { data, error } = await serviceClient().rpc("record_advance", {
    p_actor: user.id,
    p_membership: parsed.data.membershipId,
    p_amount_qepik: parsed.data.amountQepik,
    p_date: parsed.data.issuedOn,
    p_note: parsed.data.note || null,
  });

  if (error) databaseError(error.message);
  return { id: data };
}

export async function closePayrollPeriod(input: unknown) {
  const parsed = closePeriodSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const { user } = await requireSession();
  await rateLimit(`close_payroll:${user.id}`, 10);

  const { data, error } = await serviceClient().rpc("close_payroll_period", {
    p_actor: user.id,
    p_membership: parsed.data.membershipId,
    p_month: parsed.data.periodMonth,
    p_overtime_qepik: parsed.data.overtimeQepik,
  });

  if (error) databaseError(error.message);
  return { id: data };
}
