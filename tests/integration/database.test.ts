import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { SubscriptionStatus } from "@/shared/types";
type PaymentResult = { success: boolean; idempotent: boolean; transaction_id: string };
type RegistrationResult = { success: boolean; company_id: string; branch_id: string; membership_id: string };

let db: PGlite;
const owner = "10000000-0000-4000-8000-000000000001";
const worker = "10000000-0000-4000-8000-000000000002";
const foreign = "10000000-0000-4000-8000-000000000003";
const manager = "10000000-0000-4000-8000-000000000004";
const branch = "20000000-0000-4000-8000-000000000001";
const otherBranch = "20000000-0000-4000-8000-000000000002";
const membership = "30000000-0000-4000-8000-000000000002";

async function asUser<T>(user: string, sql: string) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`,
  );
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("reset role");
  }
}
async function command<T>(name: string, args: unknown[]) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
  return (await db.query<T>(`select * from ${name}(${placeholders})`, args))
    .rows;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const file of [
    "0001_identity_attendance.sql",
    "0002_attendance_commands.sql",
    "0003_attendance_corrections.sql",
    "0004_employee_self_service.sql",
    "0005_leave_decisions_and_export.sql",
    "0006_payroll_and_advances.sql",
    "0007_subscriptions_and_billing.sql",
    "0008_company_registration.sql",
    "0009_security_hardening.sql",
    "0010_subscription_limits.sql",
  ]) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
  await db.exec(`insert into auth.users values ('${owner}'),('${worker}'),('${foreign}'),('${manager}');
    insert into companies(id,name) values ('a0000000-0000-4000-8000-000000000001','Company A'),('b0000000-0000-4000-8000-000000000001','Company B');
    insert into branches(id,company_id,name,latitude,longitude,radius_m) values
    ('${branch}','a0000000-0000-4000-8000-000000000001','Baku',40,49,100),
    ('${otherBranch}','b0000000-0000-4000-8000-000000000001','Other',40,49,100);
    insert into memberships(id,user_id,company_id,role,display_name) values
    ('30000000-0000-4000-8000-000000000001','${owner}','a0000000-0000-4000-8000-000000000001','owner','Owner'),
    ('${membership}','${worker}','a0000000-0000-4000-8000-000000000001','employee','Worker'),
    ('30000000-0000-4000-8000-000000000003','${foreign}','b0000000-0000-4000-8000-000000000001','owner','Other'),
    ('30000000-0000-4000-8000-000000000004','${manager}','a0000000-0000-4000-8000-000000000001','manager','Unassigned');
    insert into branch_assignments(membership_id,branch_id,company_id) values ('${membership}','${branch}','a0000000-0000-4000-8000-000000000001');`);
});
afterAll(async () => {
  await db?.close();
});

describe("PostgreSQL tenant isolation", () => {
  it("does not expose company registration to browser database roles", async () => {
    const rows = await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated','public.register_company(uuid,text,text,text,double precision,double precision,integer)','execute') as allowed");
    expect(rows.rows[0].allowed).toBe(false);
    const anon = await db.query<{ allowed: boolean }>("select has_function_privilege('anon','public.register_company(uuid,text,text,text,double precision,double precision,integer)','execute') as allowed");
    expect(anon.rows[0].allowed).toBe(false);
  });
  it("does not reveal other companies or branches", async () => {
    expect(await asUser(worker, "select name from companies")).toEqual([
      { name: "Company A" },
    ]);
    expect(await asUser(worker, "select name from branches")).toEqual([
      { name: "Baku" },
    ]);
    expect(await asUser(manager, "select * from branches")).toEqual([]);
  });
  it("prevents direct writes and privilege escalation", async () => {
    await expect(
      asUser(worker, "update memberships set role='owner'"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(
        worker,
        `select record_attendance('${worker}', '${branch}', 'in')`,
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(worker, "insert into audit_events(action) values ('fake')"),
    ).rejects.toThrow(/permission denied/);
  });
  it("prevents assignments crossing company boundaries", async () => {
    await expect(
      db.exec(
        `insert into branch_assignments values ('${membership}', '${otherBranch}', 'a0000000-0000-4000-8000-000000000001')`,
      ),
    ).rejects.toThrow("FORBIDDEN");
  });
});

describe("transactional attendance", () => {
  it("allows one open attendance and rejects duplicate check-in", async () => {
    await command("record_attendance", [worker, branch, "in"]);
    await expect(
      command("record_attendance", [worker, branch, "in"]),
    ).rejects.toThrow("ALREADY_CHECKED_IN");
    expect((await asUser(worker, "select id from attendance")).length).toBe(1);
    expect(await asUser(foreign, "select id from attendance")).toEqual([]);
    expect(await asUser(manager, "select id from attendance")).toEqual([]);
  });
  it("retains the starting shift on overnight checkout", async () => {
    await db.exec(`insert into shifts(id,membership_id,branch_id,company_id,starts_at,ends_at) values ('40000000-0000-4000-8000-000000000001','${membership}','${branch}','a0000000-0000-4000-8000-000000000001','2026-10-30T18:00Z','2026-10-31T04:00Z');
    update attendance set check_in='2026-10-30T18:00Z',work_date='2026-10-30',shift_id='40000000-0000-4000-8000-000000000001';`);
    await command("record_attendance", [worker, branch, "out"]);
    const rows = await db.query<{
      date: string;
      shift_id: string;
      closed: boolean;
    }>(
      "select work_date::text as date, shift_id, check_out is not null as closed from attendance",
    );
    expect(rows.rows[0]).toEqual({
      date: "2026-10-30",
      shift_id: "40000000-0000-4000-8000-000000000001",
      closed: true,
    });
    await expect(
      command("record_attendance", [worker, branch, "out"]),
    ).rejects.toThrow("NOT_CHECKED_IN");
  });
  it("rejects a cross-company branch and archived member", async () => {
    await expect(
      command("record_attendance", [worker, otherBranch, "in"]),
    ).rejects.toThrow("FORBIDDEN");
    await db.exec(
      `update memberships set archived_at=now() where id='${membership}'`,
    );
    await expect(
      command("record_attendance", [worker, branch, "in"]),
    ).rejects.toThrow("FORBIDDEN");
    expect(await asUser(worker, "select id from attendance")).toEqual([]);
    await db.exec(
      `update memberships set archived_at=null where id='${membership}'`,
    );
  });
  it("persists rate limits between calls", async () => {
    expect(await command("consume_rate_limit", ["test-key", 2, 60])).toEqual([
      { consume_rate_limit: true },
    ]);
    expect(await command("consume_rate_limit", ["test-key", 2, 60])).toEqual([
      { consume_rate_limit: true },
    ]);
    expect(await command("consume_rate_limit", ["test-key", 2, 60])).toEqual([
      { consume_rate_limit: false },
    ]);
  });
});

describe("correction approval and audit", () => {
  let correction: string;
  it("rejects empty reasons and creates an own missed attendance request", async () => {
    await expect(
      command("request_correction", [
        worker,
        branch,
        null,
        "2026-10-20T05:00Z",
        "2026-10-20T14:00Z",
        " ",
      ]),
    ).rejects.toThrow("INVALID_INPUT");
    const rows = await command<{ request_correction: string }>(
      "request_correction",
      [
        worker,
        branch,
        null,
        "2026-10-20T05:00Z",
        "2026-10-20T14:00Z",
        "Girişi unutmuşam",
      ],
    );
    correction = rows[0].request_correction;
    expect(await asUser(worker, "select status from corrections")).toEqual([
      { status: "pending" },
    ]);
    expect(await asUser(foreign, "select id from corrections")).toEqual([]);
  });
  it("rejects employee, foreign owner and unassigned manager approvals", async () => {
    for (const actor of [worker, foreign, manager])
      await expect(
        command("decide_correction", [
          actor,
          correction,
          "approved",
          "Yoxlanıldı",
        ]),
      ).rejects.toThrow("FORBIDDEN");
  });
  it("writes the approved attendance and immutable audit once", async () => {
    await command("decide_correction", [
      owner,
      correction,
      "approved",
      "Növbə ilə yoxlanıldı",
    ]);
    await expect(
      command("decide_correction", [owner, correction, "rejected", "Təkrar"]),
    ).rejects.toThrow("ALREADY_DECIDED");
    expect((await db.query("select status from corrections")).rows).toEqual([
      { status: "approved" },
    ]);
    const audit = (
      await db.query<{
        action: string;
        actor_id: string;
        new_value: {
          attendance: { check_in: string };
          correction: {
            status: string;
            decided_by: string;
            decision_reason: string;
          };
        };
        old_value: { attendance: unknown; correction: { status: string } };
      }>(
        "select action,actor_id,new_value,old_value from audit_events where action='correction.approved'",
      )
    ).rows[0];
    expect(audit.actor_id).toBe(owner);
    expect(audit.old_value.attendance).toBeNull();
    expect(audit.old_value.correction.status).toBe("pending");
    expect(audit.new_value.attendance.check_in).toContain(
      "2026-10-20T05:00:00",
    );
    expect(audit.new_value.correction).toMatchObject({
      status: "approved",
      decided_by: owner,
      decision_reason: "Növbə ilə yoxlanıldı",
    });
    expect((await asUser(worker, "select id from attendance")).length).toBe(2);
    await expect(asUser(owner, "delete from audit_events")).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("review regressions", () => {
  it("does not reveal a shared employee's assignments in another branch", async () => {
    const scopedManager = "10000000-0000-4000-8000-000000000005";
    await db.exec(`insert into auth.users values ('${scopedManager}');
      insert into branches(id,company_id,name,latitude,longitude,radius_m) values ('20000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001','Second A',40,49,100);
      insert into memberships(id,user_id,company_id,role,display_name) values ('30000000-0000-4000-8000-000000000005','${scopedManager}','a0000000-0000-4000-8000-000000000001','manager','Scoped manager');
      insert into branch_assignments values ('30000000-0000-4000-8000-000000000005','${branch}','a0000000-0000-4000-8000-000000000001'),('${membership}','20000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001');`);
    const rows = await asUser<{ branch_id: string }>(
      scopedManager,
      "select branch_id from branch_assignments",
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.branch_id === branch)).toBe(true);
  });
  it("associates a missing entry with the shift that began before midnight", async () => {
    await db.exec(
      `insert into shifts(id,membership_id,branch_id,company_id,starts_at,ends_at) values ('40000000-0000-4000-8000-000000000005','${membership}','${branch}','a0000000-0000-4000-8000-000000000001','2020-01-01T18:00Z','2020-01-02T04:00Z');`,
    );
    const [result] = await command<{ request_correction: string }>(
      "request_correction",
      [
        worker,
        branch,
        null,
        "2020-01-01T21:00Z",
        "2020-01-02T04:00Z",
        "Gecə növbəsində giriş unudulub",
      ],
    );
    await command("decide_correction", [
      owner,
      result.request_correction,
      "approved",
      "Növbə yoxlanıldı",
    ]);
    const rows = (
      await db.query(
        "select shift_id,work_date::text from attendance where check_in='2020-01-01T21:00Z'",
      )
    ).rows;
    expect(rows).toEqual([
      {
        shift_id: "40000000-0000-4000-8000-000000000005",
        work_date: "2020-01-01",
      },
    ]);
  });
  it("audits the actual rejected decision including its actor and reason", async () => {
    const [result] = await command<{ request_correction: string }>(
      "request_correction",
      [
        worker,
        branch,
        null,
        "2020-02-01T05:00Z",
        "2020-02-01T14:00Z",
        "Qeyd sorğusu",
      ],
    );
    await command("decide_correction", [
      owner,
      result.request_correction,
      "rejected",
      "Sənədlə təsdiqlənmədi",
    ]);
    const [audit] = (
      await db.query<{
        old_value: { correction: { status: string } };
        new_value: {
          correction: {
            status: string;
            decided_by: string;
            decided_at: string;
            decision_reason: string;
          };
          attendance: unknown;
        };
      }>(
        "select old_value,new_value from audit_events where action='correction.rejected' and entity_id=$1",
        [result.request_correction],
      )
    ).rows;
    expect(audit.old_value.correction.status).toBe("pending");
    expect(audit.new_value.correction).toMatchObject({
      status: "rejected",
      decided_by: owner,
      decision_reason: "Sənədlə təsdiqlənmədi",
    });
    expect(audit.new_value.correction.decided_at).toBeTruthy();
    expect(audit.new_value.attendance).toBeNull();
  });

  it("handles employee self-service leave requests and permissions", async () => {
    // Authenticated users cannot directly insert into leave_requests
    await expect(
      asUser(
        worker,
        `insert into leave_requests(company_id,membership_id,request_type,starts_on,ends_on,reason)
         values('a0000000-0000-4000-8000-000000000001','${membership}','leave','2026-11-10','2026-11-15','Məzuniyyət')`,
      ),
    ).rejects.toThrow();

    // Request leave via command
    const [result] = await command<{ request_leave: string }>("request_leave", [
      worker,
      "leave",
      "2026-11-10",
      "2026-11-15",
      "Ailə səbəbilə məzuniyyət",
    ]);
    expect(result.request_leave).toBeTruthy();

    // Overlapping pending request should fail
    await expect(
      command("request_leave", [
        worker,
        "leave",
        "2026-11-12",
        "2026-11-18",
        "Təkrar müraciət",
      ]),
    ).rejects.toThrow("DUPLICATE_REQUEST");

    // Worker can read their own request
    const workerRequests = await asUser<{ id: string; reason: string; status: string }>(
      worker,
      "select id, reason, status from leave_requests",
    );
    expect(workerRequests).toHaveLength(1);
    expect(workerRequests[0].status).toBe("pending");
    expect(workerRequests[0].reason).toBe("Ailə səbəbilə məzuniyyət");

    // Foreign user from Company B cannot read it
    const foreignRequests = await asUser(foreign, "select * from leave_requests");
    expect(foreignRequests).toHaveLength(0);

    // Foreign user cannot decide
    const reqId = result.request_leave;
    await expect(
      command("decide_leave", [foreign, reqId, "approved", "Təsdiq edildi"]),
    ).rejects.toThrow("FORBIDDEN");

    // Worker themselves cannot decide
    await expect(
      command("decide_leave", [worker, reqId, "approved", "Öz müraciətim"]),
    ).rejects.toThrow("FORBIDDEN");

    // Owner approves
    const approved = await command<{ decide_leave: string }>("decide_leave", [
      owner,
      reqId,
      "approved",
      "Məzuniyyət təsdiqləndi",
    ]);
    expect(approved[0].decide_leave).toBe(reqId);

    // Cannot decide already decided request
    await expect(
      command("decide_leave", [owner, reqId, "rejected", "Dəyişmək istəyirəm"]),
    ).rejects.toThrow("ALREADY_DECIDED");

    // Check updated status in DB
    const updated = await asUser<{ status: string; decision_reason: string }>(
      worker,
      `select status, decision_reason from leave_requests where id = '${reqId}'`,
    );
    expect(updated[0].status).toBe("approved");
    expect(updated[0].decision_reason).toBe("Məzuniyyət təsdiqləndi");
  });

  it("enforces advance recording, payroll calculation and tenant boundaries", async () => {
    await expect(command("record_advance", [manager, membership, 1000, "2026-11-01", "Other branch"])).rejects.toThrow("FORBIDDEN");
    // Foreign user cannot record advance
    await expect(
      command("record_advance", [
        foreign,
        membership,
        15000,
        "2026-10-25",
        "Avans",
      ]),
    ).rejects.toThrow("FORBIDDEN");

    // Worker themselves cannot record advance
    await expect(
      command("record_advance", [
        worker,
        membership,
        15000,
        "2026-10-25",
        "Özümə avans",
      ]),
    ).rejects.toThrow("FORBIDDEN");

    // Owner records advance of 150.00 AZN (15000 qəpik)
    const adv = await command<{ record_advance: string }>("record_advance", [
      owner,
      membership,
      15000,
      "2026-10-25",
      "Məişət xərci üçün avans",
    ]);
    expect(adv[0].record_advance).toBeTruthy();

    // Owner records second advance of 50.00 AZN (5000 qəpik) in November
    await command("record_advance", [
      owner,
      membership,
      5000,
      "2026-11-01",
      "Noyabr avansı",
    ]);

    // Worker can read their own advances
    const workerAdvances = await asUser<{ amount_qepik: number }>(
      worker,
      "select amount_qepik from salary_advances",
    );
    expect(workerAdvances).toHaveLength(2);

    // Foreign user cannot read advances
    const foreignAdvances = await asUser(foreign, "select * from salary_advances");
    expect(foreignAdvances).toHaveLength(0);

    // Insert employment terms for the worker
    await db.exec(`insert into employment_terms(membership_id, company_id, started_on, pay_type, base_pay_qepik, payday_day)
      values ('${membership}', 'a0000000-0000-4000-8000-000000000001', '2025-04-14', 'monthly', 85000, 5)
      on conflict do nothing;`);

    // Owner closes November payroll: Base pay 850.00 AZN (85000 qəpik) + Overtime 30.00 AZN (3000 qəpik) - Advance 50.00 AZN (5000 qəpik) = 830.00 AZN (83000 qəpik)
    const closed = await command<{ close_payroll_period: string }>("close_payroll_period", [
      owner,
      membership,
      "2026-11",
      3000,
    ]);
    expect(closed[0].close_payroll_period).toBeTruthy();

    // Verify net pay calculation in DB
    const periods = await asUser<{
      base_pay_qepik: number;
      overtime_pay_qepik: number;
      advances_qepik: number;
      net_pay_qepik: number;
      status: string;
    }>(worker, "select * from payroll_periods where period_month = '2026-11'");
    expect(periods).toHaveLength(1);
    expect(Number(periods[0].base_pay_qepik)).toBe(85000);
    expect(Number(periods[0].overtime_pay_qepik)).toBe(3000);
    expect(Number(periods[0].advances_qepik)).toBe(5000);
    expect(Number(periods[0].net_pay_qepik)).toBe(83000);
    expect(periods[0].status).toBe("closed");

    // Cannot close already closed period
    await expect(
      command("close_payroll_period", [owner, membership, "2026-11", 0]),
    ).rejects.toThrow("ALREADY_CLOSED");
  });
});

describe("stage 5 subscription limits and billing", () => {
  it("computes subscription status with 14-day trial defaults", async () => {
    const res = await command<{ get_subscription_status: SubscriptionStatus }>(
      "get_subscription_status",
      ["a0000000-0000-4000-8000-000000000001"],
    );
    const status = res[0].get_subscription_status;
    expect(status.effective_plan).toBe("business");
    expect(status.status).toBe("trialing");
    expect(status.max_employees).toBe(25);
    expect(status.max_branches).toBe(2);
    expect(status.is_limit_exceeded).toBe(false);
  });

  it("processes subscription payments idempotently and upgrades plan", async () => {
    const idempotencyKey = "test-sandbox-tx-001";
    const txId = "tx-sbx-999";
    const companyId = "a0000000-0000-4000-8000-000000000001";

    // Invalid amount check (Start is 15 AZN / 1500 qəpik, not 1000)
    await expect(
      command("process_subscription_payment", [
        idempotencyKey,
        txId,
        companyId,
        "start",
        1000,
        0,
        owner,
      ]),
    ).rejects.toThrow("INVALID_AMOUNT");

    // Successful payment for Business with 1 extra branch (29 AZN + 5 AZN = 34 AZN / 3400 qəpik)
    const payRes = await command<{ process_subscription_payment: PaymentResult }>(
      "process_subscription_payment",
      [idempotencyKey, txId, companyId, "business", 3400, 1, owner],
    );
    expect(payRes[0].process_subscription_payment.success).toBe(true);

    // Idempotent retry with same key returns success without re-charging
    const replay = await command<{ process_subscription_payment: PaymentResult }>(
      "process_subscription_payment",
      [idempotencyKey, txId, companyId, "business", 3400, 1, owner],
    );
    expect(replay[0].process_subscription_payment.idempotent).toBe(true);

    // Verify upgraded status
    const statusRes = await command<{ get_subscription_status: SubscriptionStatus }>(
      "get_subscription_status",
      [companyId],
    );
    const updated = statusRes[0].get_subscription_status;
    expect(updated.status).toBe("active");
    expect(updated.effective_plan).toBe("business");
    expect(updated.max_branches).toBe(3); // 2 + 1 extra = 3
    expect(updated.extra_branches).toBe(1);
    const audit = await db.query<{ actor_id: string }>("select actor_id from audit_events where action='subscription.activated' order by created_at desc limit 1");
    expect(audit.rows[0].actor_id).toBe(owner);
    await expect(command("process_subscription_payment", ["foreign-owner", "foreign-tx", companyId, "business", 2900, 0, foreign])).rejects.toThrow("FORBIDDEN");
    await expect(command("process_subscription_payment", [idempotencyKey, "replay-other-company", "b0000000-0000-4000-8000-000000000001", "business", 3400, 1, foreign])).rejects.toThrow("INVALID_INPUT");
    await expect(command("switch_to_free", [worker, companyId, "free-test"])).rejects.toThrow("FORBIDDEN");
    const free = await command<{ switch_to_free: PaymentResult }>("switch_to_free", [owner, companyId, "free-test"]);
    expect(free[0].switch_to_free.success).toBe(true);
    await command("process_subscription_payment", ["new-paid", "new-paid-tx", companyId, "business", 2900, 0, owner]);
    const replayFree = await command<{ switch_to_free: PaymentResult }>("switch_to_free", [owner, companyId, "free-test"]);
    expect(replayFree[0].switch_to_free.idempotent).toBe(true);
    const freeAudits = await db.query("select id from audit_events where action='subscription.free'");
    expect(freeAudits.rows).toHaveLength(1);
    const afterReplay = await command<{ get_subscription_status: SubscriptionStatus }>("get_subscription_status", [companyId]);
    expect(afterReplay[0].get_subscription_status.effective_plan).toBe("business");
  });

  it("registers a new company atomically with initial branch, owner and trial", async () => {
    const newOwnerId = "10000000-0000-4000-8000-000000000099";
    await db.exec(`insert into auth.users values ('${newOwnerId}') on conflict do nothing;`);

    // Invalid short input
    await expect(
      command("register_company", [newOwnerId, "A", "C", "Filial", 40.37, 49.84, 100]),
    ).rejects.toThrow("INVALID_INPUT");

    // Successful registration
    const res = await command<{ register_company: RegistrationResult }>("register_company", [
      newOwnerId,
      "Rəşad Qasımov",
      "Qasımov Kafe",
      "Nəsimi filialı",
      40.3756,
      49.8465,
      100,
    ]);
    const result = res[0].register_company;
    expect(result.success).toBe(true);
    expect(result.company_id).toBeTruthy();
    expect(result.branch_id).toBeTruthy();
    expect(result.membership_id).toBeTruthy();

    // Check membership role is owner
    const members = await asUser<{ role: string; display_name: string }>(
      newOwnerId,
      `select role, display_name from memberships where company_id = '${result.company_id}'`,
    );
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("owner");
    expect(members[0].display_name).toBe("Rəşad Qasımov");

    // Check subscription initialized with 14-day business trial
    const statusRes = await command<{ get_subscription_status: SubscriptionStatus }>(
      "get_subscription_status",
      [result.company_id],
    );
    const sub = statusRes[0].get_subscription_status;
    expect(sub.status).toBe("trialing");
    expect(sub.effective_plan).toBe("business");
    expect(sub.max_employees).toBe(25);
    expect(sub.max_branches).toBe(2);

    // Duplicate registration for same user is rejected
    await expect(
      command("register_company", [
        newOwnerId,
        "Rəşad Qasımov",
        "İkinci Kafe",
        "Filial",
        40.37,
        49.84,
        100,
      ]),
    ).rejects.toThrow("ALREADY_EXISTS");
  });
});


