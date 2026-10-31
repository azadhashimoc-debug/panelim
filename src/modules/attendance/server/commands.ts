import "server-only";
import { z } from "zod";
import { requireBranchAccess } from "@/modules/organization/server/access";
import { requireConfig } from "@/infrastructure/supabase/config";
import { serviceClient } from "@/infrastructure/supabase/server";
import { verifyQr } from "../domain/qr";
import { assertLocation } from "../domain/location";
import { databaseError, rateLimit } from "@/shared/server/http";
const schema = z
  .object({
    direction: z.enum(["in", "out"]),
    token: z.string().min(1).max(1024),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracy: z.number().positive().max(100),
  })
  .strict();
export async function recordAttendance(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const { qrSecret } = requireConfig();
  const branchId = verifyQr(parsed.data.token, qrSecret);
  const { user, branch } = await requireBranchAccess(branchId);
  await rateLimit(`attendance:${user.id}`, 10);
  assertLocation(branch, parsed.data);
  const { data, error } = await serviceClient().rpc("record_attendance", {
    p_actor: user.id,
    p_branch: branchId,
    p_direction: parsed.data.direction,
  });
  if (error) databaseError(error.message);
  return { id: data };
}
