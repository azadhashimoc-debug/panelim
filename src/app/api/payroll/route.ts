import { closePayrollPeriod, recordSalaryAdvance } from "@/modules/organization/server/payroll";
import { requireSession } from "@/modules/identity/server/session";
import { fail, ok, readMutation } from "@/shared/server/http";

export async function POST(request: Request) {
  try {
    const body = await readMutation(request);
    if (body && typeof body === "object" && "periodMonth" in body) {
      return ok(await closePayrollPeriod(body));
    }
    return ok(await recordSalaryAdvance(body));
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: Request) {
  try {
    const { client, user } = await requireSession();
    const { data: member } = await client
      .from("memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .in("role", ["owner", "manager", "accountant"])
      .maybeSingle();
    if (!member) throw new Error("FORBIDDEN");

    const url = new URL(request.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const [advancesRes, periodsRes, termsRes, membersRes] = await Promise.all([
      client
        .from("salary_advances")
        .select("*")
        .eq("company_id", member.company_id)
        .order("issued_on", { ascending: false })
        .limit(100),
      client
        .from("payroll_periods")
        .select("*")
        .eq("company_id", member.company_id)
        .eq("period_month", month),
      client
        .from("employment_terms")
        .select("*")
        .eq("company_id", member.company_id),
      client
        .from("memberships")
        .select("id, display_name, role")
        .eq("company_id", member.company_id)
        .is("archived_at", null),
    ]);

    if (advancesRes.error || periodsRes.error || termsRes.error || membersRes.error) {
      throw new Error("INTERNAL");
    }

    return ok({
      advances: advancesRes.data || [],
      periods: periodsRes.data || [],
      terms: termsRes.data || [],
      members: membersRes.data || [],
    });
  } catch (error) {
    return fail(error);
  }
}
