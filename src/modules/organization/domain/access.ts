export function authorizeBranch(
  member: { company_id: string; role: string; archived_at: string | null },
  branch: { company_id: string },
  assigned: boolean,
  permission: "attendance" | "manage",
) {
  if (member.archived_at || member.company_id !== branch.company_id)
    throw new Error("FORBIDDEN");
  if (member.role === "owner") return;
  if (
    !assigned ||
    !["employee", "manager"].includes(member.role) ||
    (permission === "manage" && member.role !== "manager")
  )
    throw new Error("FORBIDDEN");
}
