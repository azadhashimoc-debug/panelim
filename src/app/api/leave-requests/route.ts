import { decideLeave, requestLeave } from "@/modules/attendance/server/leave-requests";
import { requireSession } from "@/modules/identity/server/session";
import { fail, ok, readMutation } from "@/shared/server/http";

export async function POST(request: Request) {
  try {
    const body = await readMutation(request);
    if (body && typeof body === "object" && "decision" in body)
      return ok(await decideLeave(body));
    return ok(await requestLeave(body));
  } catch (error) {
    return fail(error);
  }
}

export async function GET() {
  try {
    const { client, user } = await requireSession();
    const { data: member } = await client
      .from("memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .in("role", ["owner", "manager"])
      .maybeSingle();
    if (!member) throw new Error("FORBIDDEN");

    const { data: leaveRequests, error } = await client
      .from("leave_requests")
      .select("id, company_id, membership_id, request_type, starts_on, ends_on, reason, status, decision_reason, created_at")
      .eq("company_id", member.company_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    return ok({ leaveRequests: leaveRequests || [] });
  } catch (error) {
    return fail(error);
  }
}
