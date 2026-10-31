import { requireSession } from "@/modules/identity/server/session";
import { fail, ok } from "@/shared/server/http";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    const { client, user } = await requireSession();
    const companyId = new URL(request.url).searchParams.get("company");
    if (companyId && !z.uuid().safeParse(companyId).success)
      throw new Error("INVALID_INPUT");
    let query = client
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("id")
      .limit(1);
    if (companyId) query = query.eq("company_id", companyId);
    const { data: member, error } = await query.single();
    if (error || !member) throw new Error("FORBIDDEN");
    const results = await Promise.all([
      client
        .from("branches")
        .select("id,company_id,name,latitude,longitude,radius_m")
        .eq("company_id", member.company_id)
        .is("archived_at", null)
        .order("name"),
      client
        .from("attendance")
        .select(
          "id,membership_id,branch_id,check_in,check_out,work_date,source",
        )
        .eq("membership_id", member.id)
        .order("check_in", { ascending: false })
        .limit(30),
      client
        .from("shifts")
        .select("id,branch_id,starts_at,ends_at")
        .eq("membership_id", member.id)
        .gte("ends_at", new Date(Date.now() - 24 * 3600000).toISOString())
        .order("starts_at")
        .limit(14),
      client
        .from("corrections")
        .select("*")
        .eq("membership_id", member.id)
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("companies")
        .select("name")
        .eq("id", member.company_id)
        .single(),
      client.from("employment_terms").select("started_on,pay_type,base_pay_qepik,payday_day").eq("membership_id", member.id).maybeSingle(),
      client.from("leave_requests").select("id,request_type,starts_on,ends_on,reason,status,created_at").eq("membership_id", member.id).order("created_at", { ascending: false }).limit(30),
    ]);
    if (results.some((r) => r.error)) throw new Error("INTERNAL");
    return ok({
      member,
      branches: results[0].data,
      attendance: results[1].data,
      shifts: results[2].data,
      corrections: results[3].data,
      companyName: results[4].data?.name,
      employmentTerms: results[5].data,
      leaveRequests: results[6].data,
    });
  } catch (error) {
    return fail(error);
  }
}
