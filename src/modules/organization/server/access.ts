import "server-only";
import { requireSession } from "@/modules/identity/server/session";
import { authorizeBranch } from "../domain/access";
import type { Branch, Membership } from "@/shared/types";
export async function requireBranchAccess(
  branchId: string,
  permission: "attendance" | "manage" = "attendance",
) {
  const { client, user } = await requireSession();
  const { data: branch, error: branchError } = await client
    .from("branches")
    .select("id,company_id,name,latitude,longitude,radius_m")
    .eq("id", branchId)
    .is("archived_at", null)
    .single<Branch>();
  if (branchError || !branch) throw new Error("FORBIDDEN");
  const { data: member, error } = await client
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .eq("company_id", branch.company_id)
    .is("archived_at", null)
    .single<Membership>();
  if (error || !member) throw new Error("FORBIDDEN");
  const { data: assignment } = await client
    .from("branch_assignments")
    .select("branch_id")
    .eq("membership_id", member.id)
    .eq("branch_id", branchId)
    .maybeSingle();
  authorizeBranch(member, branch, Boolean(assignment), permission);
  return { client, user, member, branch };
}
