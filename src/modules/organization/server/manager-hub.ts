import "server-only";
import { z } from "zod";
import { requireSession } from "@/modules/identity/server/session";
import { serviceClient } from "@/infrastructure/supabase/server";
import { rateLimit } from "@/shared/server/http";

export async function requireManagerSession() {
  const { client, user } = await requireSession();
  const { data: member, error } = await client
    .from("memberships")
    .select("id, company_id, role, display_name")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .in("role", ["owner", "manager"])
    .maybeSingle();

  if (error || !member) throw new Error("FORBIDDEN");
  return { client, user, member };
}

export async function fetchManagerHubData() {
  const { member } = await requireManagerSession();
  const companyId = member.company_id;
  const db = serviceClient();

  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    companyRes,
    branchesRes,
    membersRes,
    termsRes,
    assignmentsRes,
    shiftsRes,
    leaveRes,
    correctionsRes,
    advancesRes,
    periodsRes,
    attendanceRes,
  ] = await Promise.all([
    db.from("companies").select("id, name").eq("id", companyId).single(),
    db.from("branches").select("*").eq("company_id", companyId).is("archived_at", null).order("name"),
    db.from("memberships").select("*").eq("company_id", companyId).is("archived_at", null).order("display_name"),
    db.from("employment_terms").select("*").eq("company_id", companyId),
    db.from("branch_assignments").select("*").eq("company_id", companyId),
    db.from("shifts").select("*").eq("company_id", companyId).gte("ends_at", new Date(Date.now() - 24 * 3600000).toISOString()).order("starts_at").limit(100),
    db.from("leave_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100),
    db.from("corrections").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100),
    db.from("salary_advances").select("*").eq("company_id", companyId).order("issued_on", { ascending: false }).limit(100),
    db.from("payroll_periods").select("*").eq("company_id", companyId).order("period_month", { ascending: false }).limit(50),
    db.from("attendance").select("*").eq("company_id", companyId).gte("work_date", todayStr).limit(200),
  ]);

  if (companyRes.error || branchesRes.error || membersRes.error) {
    throw new Error("INTERNAL");
  }

  return {
    company: companyRes.data,
    member,
    branches: branchesRes.data || [],
    team: membersRes.data || [],
    employmentTerms: termsRes.data || [],
    branchAssignments: assignmentsRes.data || [],
    shifts: shiftsRes.data || [],
    leaveRequests: leaveRes.data || [],
    corrections: correctionsRes.data || [],
    advances: advancesRes.data || [],
    payrollPeriods: periodsRes.data || [],
    todayAttendance: attendanceRes.data || [],
  };
}

const accessLinkSchema = z.object({ membershipId: z.string().uuid() });

/**
 * İşçi üçün tək istifadəlik şifrə təyini linki yaradır. Link hədəf hesaba tam giriş verdiyi üçün
 * yalnız rəhbərin həqiqətən idarə etdiyi şəxs üçün buraxılır: sahib şirkətin qeyri-sahib üzvləri,
 * filial rəhbəri isə yalnız öz filialının işçiləri üçün. Token URL fraqmentindədir, serverə,
 * jurnallara və keçid önizləmələrinə düşmür; audit qeydinə yazılmır.
 */
export async function createAccessLink(input: unknown) {
  const { user, member } = await requireManagerSession();
  const parsed = accessLinkSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("NOT_CONFIGURED");

  await rateLimit(`access_link:${member.company_id}`, 20, 60);

  const db = serviceClient();
  const { data: target, error: targetError } = await db
    .from("memberships")
    .select("id, user_id, role")
    .eq("id", parsed.data.membershipId)
    .eq("company_id", member.company_id)
    .is("archived_at", null)
    .maybeSingle();
  if (targetError) throw new Error("INTERNAL");
  if (!target || target.role === "owner" || target.id === member.id) {
    throw new Error("FORBIDDEN");
  }

  // Link bütün hesabı açır: başqa şirkətdə də aktiv olan istifadəçiyə toxunulmur
  const { data: elsewhere, error: elsewhereError } = await db
    .from("memberships")
    .select("id")
    .eq("user_id", target.user_id)
    .neq("company_id", member.company_id)
    .is("archived_at", null)
    .limit(1);
  if (elsewhereError) throw new Error("INTERNAL");
  if (elsewhere?.length) throw new Error("FORBIDDEN");

  const { data: targetBranches, error: branchError } = await db
    .from("branch_assignments")
    .select("branch_id")
    .eq("membership_id", target.id);
  if (branchError) throw new Error("INTERNAL");
  const targetBranchIds = (targetBranches ?? []).map((a) => a.branch_id as string);

  if (member.role !== "owner") {
    if (target.role !== "employee") throw new Error("FORBIDDEN");
    const { data: ownBranches, error: ownError } = await db
      .from("branch_assignments")
      .select("branch_id")
      .eq("membership_id", member.id);
    if (ownError) throw new Error("INTERNAL");
    const own = new Set((ownBranches ?? []).map((a) => a.branch_id as string));
    if (!targetBranchIds.some((branchId) => own.has(branchId))) {
      throw new Error("FORBIDDEN");
    }
  }

  // audit_events.branch_id məcburidir: filialı olmayan üzv üçün şirkətin aktiv filialı yazılır
  let auditBranchId: string | undefined = targetBranchIds[0];
  if (!auditBranchId) {
    const { data: companyBranches, error: companyError } = await db
      .from("branches")
      .select("id")
      .eq("company_id", member.company_id)
      .is("archived_at", null)
      .limit(1);
    if (companyError) throw new Error("INTERNAL");
    auditBranchId = companyBranches?.[0]?.id as string | undefined;
  }
  if (!auditBranchId) throw new Error("INTERNAL");

  const { data: targetUser, error: userError } = await db.auth.admin.getUserById(
    target.user_id as string,
  );
  const email = targetUser?.user?.email;
  if (userError || !email) throw new Error("INTERNAL");

  const { data: link, error: linkError } = await db.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  const token = link?.properties?.hashed_token;
  if (linkError || !token) throw new Error("INTERNAL");

  const { error: auditError } = await db.from("audit_events").insert({
    company_id: member.company_id,
    branch_id: auditBranchId,
    actor_id: user.id,
    action: "employee.access_link_created",
    entity_id: target.id,
    reason: "İşçi üçün giriş linki yaradıldı",
  });
  if (auditError) throw new Error("INTERNAL");

  return { url: `${new URL(appUrl).origin}/davet#t=${token}` };
}

const addEmployeeSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  role: z.enum(["employee", "manager", "accountant"]),
  branchId: z.string().uuid(),
  payType: z.enum(["monthly", "hourly"]).default("monthly"),
  basePayQepik: z.number().int().min(0).max(100000000).default(85000),
  paydayDay: z.number().int().min(1).max(31).default(5),
});

export async function addEmployee(input: unknown) {
  const { user, member } = await requireManagerSession();
  const parsed = addEmployeeSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");

  await rateLimit(`add_employee:${member.company_id}`, 10, 60);

  const db = serviceClient();

  // Create auth user
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email: parsed.data.email.trim().toLowerCase(),
    password: crypto.randomUUID() + "A1!",
    email_confirm: true,
    user_metadata: {
      display_name: parsed.data.displayName,
    },
  });

  if (authErr || !authData.user) {
    if (authErr?.message.includes("already registered") || authErr?.message.includes("exists")) {
      throw new Error("ALREADY_EXISTS");
    }
    throw new Error("INTERNAL");
  }

  // Insert membership (enforces employee capacity triggers)
  const { data: newMember, error: memErr } = await db
    .from("memberships")
    .insert({
      company_id: member.company_id,
      user_id: authData.user.id,
      display_name: parsed.data.displayName,
      role: parsed.data.role,
    })
    .select("id")
    .single();

  if (memErr || !newMember) throw new Error("INTERNAL");

  // Insert employment terms
  await db.from("employment_terms").insert({
    company_id: member.company_id,
    membership_id: newMember.id,
    started_on: new Date().toISOString().slice(0, 10),
    pay_type: parsed.data.payType,
    base_pay_qepik: parsed.data.basePayQepik,
    payday_day: parsed.data.paydayDay,
  });

  // Assign to branch
  await db.from("branch_assignments").insert({
    membership_id: newMember.id,
    branch_id: parsed.data.branchId,
    company_id: member.company_id,
  });

  // Audit event
  await db.from("audit_events").insert({
    company_id: member.company_id,
    branch_id: parsed.data.branchId,
    actor_id: user.id,
    action: "employee.created",
    entity_id: newMember.id,
    new_value: {
      display_name: parsed.data.displayName,
      email: parsed.data.email,
      role: parsed.data.role,
      branch_id: parsed.data.branchId,
    },
    reason: "Yeni işçi əlavə edildi",
  });

  return { success: true, membershipId: newMember.id };
}

const addBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  latitude: z.number().min(-90).max(90).default(40.3756),
  longitude: z.number().min(-180).max(180).default(49.8465),
  radiusM: z.number().int().min(20).max(500).default(100),
});

export async function addBranch(input: unknown) {
  const { user, member } = await requireManagerSession();
  if (member.role !== "owner") throw new Error("FORBIDDEN");

  const parsed = addBranchSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");

  await rateLimit(`add_branch:${member.company_id}`, 5, 60);

  const db = serviceClient();

  const { data: newBranch, error } = await db
    .from("branches")
    .insert({
      company_id: member.company_id,
      name: parsed.data.name,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      radius_m: parsed.data.radiusM,
    })
    .select("id")
    .single();

  if (error || !newBranch) throw new Error("INTERNAL");

  await db.from("audit_events").insert({
    company_id: member.company_id,
    branch_id: newBranch.id,
    actor_id: user.id,
    action: "branch.created",
    entity_id: newBranch.id,
    new_value: { name: parsed.data.name },
    reason: "Yeni filial yaradıldı",
  });

  return { success: true, branchId: newBranch.id };
}

const addShiftSchema = z.object({
  membershipId: z.string().uuid(),
  branchId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function addShift(input: unknown) {
  const { member } = await requireManagerSession();
  const parsed = addShiftSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");

  const starts = new Date(parsed.data.startsAt);
  const ends = new Date(parsed.data.endsAt);
  if (ends <= starts || ends.getTime() - starts.getTime() > 36 * 3600000) {
    throw new Error("INVALID_INPUT");
  }

  await rateLimit(`add_shift:${member.company_id}`, 30, 60);

  const db = serviceClient();

  const { data: shift, error } = await db
    .from("shifts")
    .insert({
      company_id: member.company_id,
      membership_id: parsed.data.membershipId,
      branch_id: parsed.data.branchId,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
    })
    .select("id")
    .single();

  if (error || !shift) throw new Error("INTERNAL");

  return { success: true, shiftId: shift.id };
}
