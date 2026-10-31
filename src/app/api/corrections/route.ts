import {
  requestCorrection,
  decideCorrection,
} from "@/modules/attendance/server/corrections";
import { requireSession } from "@/modules/identity/server/session";
import { fail, ok, readMutation } from "@/shared/server/http";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const body = await readMutation(request);
    if (body && typeof body === "object" && "decision" in body)
      return ok(await decideCorrection(body));
    return ok(await requestCorrection(body));
  } catch (error) {
    return fail(error);
  }
}
export async function GET(request: Request) {
  try {
    const branchId = new URL(request.url).searchParams.get("branch");
    if (!branchId || !z.uuid().safeParse(branchId).success)
      throw new Error("INVALID_INPUT");
    const { requireBranchAccess } =
      await import("@/modules/organization/server/access");
    await requireBranchAccess(branchId, "manage");
    const { client } = await requireSession();
    const results = await Promise.all([
      client
        .from("corrections")
        .select("*")
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at")
        .limit(100),
      client
        .from("attendance")
        .select("*")
        .eq("branch_id", branchId)
        .or(
          `check_out.is.null,check_in.gte.${new Date(Date.now() - 36 * 3600000).toISOString()}`,
        )
        .order("check_out", { ascending: false, nullsFirst: true })
        .order("check_in", { ascending: false })
        .limit(100),
      client
        .from("memberships")
        .select("id,display_name")
        .is("archived_at", null),
    ]);
    if (results.some((r) => r.error)) throw new Error("INTERNAL");
    return ok({
      corrections: results[0].data,
      attendance: results[1].data,
      members: results[2].data,
    });
  } catch (error) {
    return fail(error);
  }
}
