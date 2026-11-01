import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, beforeEach, afterEach, afterAll, expect, it } from "vitest";

let db: PGlite;
const company = "a0000000-0000-4000-8000-000000000001";
const other = "b0000000-0000-4000-8000-000000000001";
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function rpc(name: string, args: unknown[]) {
  const result = await db.query<Record<string, unknown>>(`select ${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as result`, args);
  return result.rows[0].result as Record<string, unknown>;
}
async function status() { return rpc("get_subscription_status", [company]); }
async function selectFree(members = [id(11), id(12), id(13)], branch = id(21), key = "selection") {
  return rpc("complete_free_selection", [id(1), company, members, branch, key]);
}
async function expire() { await db.exec(`update subscriptions set trial_ends_at=now() where company_id='${company}'`); }
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const file of (await readdir("supabase/migrations")).filter(f => f.endsWith(".sql")).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
});
beforeEach(async () => {
  await db.exec(`begin;
    insert into auth.users values ('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}'),('${id(5)}');
    insert into companies(id,name) values ('${company}','Company'),('${other}','Other');
    insert into branches(id,company_id,name,latitude,longitude,radius_m) values
      ('${id(21)}','${company}','One',40,49,100),('${id(22)}','${company}','Two',40,49,100),('${id(23)}','${other}','Other',40,49,100);
    insert into memberships(id,user_id,company_id,role,display_name) values
      ('${id(11)}','${id(1)}','${company}','owner','Owner'),('${id(12)}','${id(2)}','${company}','employee','Worker'),
      ('${id(13)}','${id(3)}','${company}','manager','Manager'),('${id(14)}','${id(4)}','${company}','employee','Fourth'),
      ('${id(15)}','${id(5)}','${other}','owner','Other owner');
    insert into branch_assignments values ('${id(12)}','${id(22)}','${company}');
    insert into subscriptions(company_id) values ('${company}') on conflict do nothing;
    savepoint test_body;`);
});
afterEach(async () => { await db.exec("rollback"); });
afterAll(async () => { await db.close(); });
// Errors abort transactions: isolate expected failures using savepoints.
async function rejects(action: () => Promise<unknown>, error: string) {
  await db.exec("savepoint expected_error");
  await expect(action()).rejects.toThrow(error);
  await db.exec("rollback to savepoint expected_error");
}
it("expires the trial exactly at its deadline and persists one audited Free transition", async () => {
  await expire();
  expect(await status()).toMatchObject({ plan_tier: "free", status: "active", effective_plan: "free", max_employees: 3, max_branches: 1, is_limit_exceeded: true });
  await status();
  expect((await db.query("select * from audit_events where action='subscription.expired'")).rows).toHaveLength(1);
  expect((await db.query("select plan_tier,status,extra_branches from subscriptions where company_id=$1", [company])).rows[0]).toEqual({ plan_tier: "free", status: "active", extra_branches: 0 });
});
it("uses purchased Start branches without increasing the employee limit", async () => {
  await db.exec(`update subscriptions set status='active',plan_tier='start',extra_branches=2,current_period_ends_at=now()+interval '30 days'`);
  expect(await status()).toMatchObject({ max_employees: 10, max_branches: 3 });
});
it.each([["start",10],["business",25],["growth",50]] as const)("enforces the %s employee boundary including reactivation", async (plan, limit) => {
  await db.query("update subscriptions set status='active',plan_tier=$1,current_period_ends_at=now()+interval '30 days',extra_branches=1 where company_id=$2", [plan, company]);
  for (let n=100; n<100+limit-4; n++) {
    await db.query("insert into auth.users values ($1)", [id(n)]);
    await db.query("insert into memberships(id,user_id,company_id,role,display_name) values ($1,$2,$3,'employee','Added')", [id(n+200), id(n), company]);
  }
  await db.query("insert into auth.users values ($1)", [id(199)]);
  await rejects(() => db.query("insert into memberships(id,user_id,company_id,role,display_name) values ($1,$2,$3,'employee','Overflow')", [id(399),id(199),company]), "EMPLOYEE_LIMIT_REACHED");
  await db.query("update memberships set archived_at=now() where id=$1", [id(14)]);
  await db.query("insert into memberships(id,user_id,company_id,role,display_name) values ($1,$2,$3,'employee','Replacement')", [id(399),id(199),company]);
  await rejects(() => db.query("update memberships set archived_at=null where id=$1", [id(14)]), "EMPLOYEE_LIMIT_REACHED");
  expect(await status()).toMatchObject({ active_employees: limit, max_employees: limit });
});
it("automatically allows Free operation when existing records fit the limits", async () => {
  await db.exec(`update branches set archived_at=now() where id='${id(22)}'; update memberships set archived_at=now() where id='${id(14)}'`);
  await expire();
  expect(await status()).toMatchObject({ effective_plan: "free", is_limit_exceeded: false });
  await rejects(() => db.exec(`update memberships set archived_at=null where id='${id(14)}'`), "EMPLOYEE_LIMIT_REACHED");
});
it("keeps suspended members' historical reads but prevents a suspended manager from deciding", async () => {
  await db.exec(`insert into branch_assignments values ('${id(13)}','${id(21)}','${company}')`);
  const request = await rpc("request_correction", [id(2),id(22),null,"2026-01-01T06:00Z","2026-01-01T14:00Z","Missing entry"]);
  await expire(); await selectFree([id(11),id(12)]);
  await rejects(() => rpc("decide_correction", [id(3),request,"rejected","Checked reason"]), "FORBIDDEN");
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id(3)}',true)`);
  expect((await db.query("select display_name from memberships where id=$1", [id(13)])).rows).toHaveLength(1);
  await db.exec("reset role");
});
it("keeps selection and private pre-limit commands inaccessible to browser roles", async () => {
  for (const role of ["anon","authenticated","service_role"]) {
    expect((await db.query<{ allowed: boolean }>("select has_function_privilege($1,'public.record_attendance_before_limits(uuid,uuid,text)','execute') as allowed",[role])).rows[0].allowed).toBe(false);
  }
  expect((await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated','public.complete_free_selection(uuid,uuid,uuid[],uuid,text)','execute') as allowed")).rows[0].allowed).toBe(false);
});
it("blocks a third trial branch and allows archival followed by replacement", async () => {
  await rejects(() => db.exec(`insert into branches(company_id,name,latitude,longitude,radius_m) values ('${company}','Third',40,49,100)`), "BRANCH_LIMIT_REACHED");
  await db.exec(`update branches set archived_at=now() where id='${id(22)}'; insert into branches(company_id,name,latitude,longitude,radius_m) values ('${company}','Replacement',40,49,100)`);
  await rejects(() => db.exec(`update branches set archived_at=null where id='${id(22)}'`), "BRANCH_LIMIT_REACHED");
});
it("blocks business writes over the Free limit while permitting reads", async () => {
  await expire();
  await rejects(() => rpc("record_attendance", [id(2), id(22), "in"]), "PLAN_SELECTION_REQUIRED");
  expect((await db.query("select id from memberships")).rows).toHaveLength(5);
});
it("requires the owner and validates tenant, duplicates, archived records and owner retention atomically", async () => {
  await expire();
  await rejects(() => rpc("complete_free_selection", [id(2), company, [id(11)], id(21), "bad"]), "FORBIDDEN");
  for (const members of [[id(12)], [id(11), id(11)], [id(11), id(15)], [id(11), id(12), id(13), id(14)]]) {
    await rejects(() => selectFree(members), "INVALID_INPUT");
  }
  await rejects(() => selectFree(undefined, id(23)), "INVALID_INPUT");
  await db.exec(`update memberships set archived_at=now() where id='${id(14)}'`);
  await rejects(() => selectFree([id(11), id(14)]), "INVALID_INPUT");
  expect((await db.query("select id from memberships where archived_at is null")).rows).toHaveLength(4);
});
it("suspends unselected records, retains history and assigns selected workers to the retained branch", async () => {
  await db.exec(`insert into attendance(company_id,branch_id,membership_id,work_date,check_in,check_out) values ('${company}','${id(22)}','${id(14)}',current_date,now()-interval '2 hours',now()-interval '1 hour')`);
  await expire();
  expect(await selectFree()).toMatchObject({ success: true, idempotent: false });
  expect(await status()).toMatchObject({ active_employees: 3, active_branches: 1, is_limit_exceeded: false });
  expect((await db.query("select archived_at,plan_disabled_at is not null as disabled from memberships where id=$1", [id(14)])).rows[0]).toEqual({ archived_at: null, disabled: true });
  expect((await db.query("select * from attendance")).rows).toHaveLength(1);
  expect((await db.query("select * from branch_assignments where membership_id=$1 and branch_id=$2", [id(12), id(21)])).rows).toHaveLength(1);
  expect((await db.query("select old_value,new_value from audit_events where action='subscription.selection'")).rows).toHaveLength(1);
  expect(await rpc("record_attendance", [id(2), id(21), "in"])).toBeTruthy();
  await rejects(() => rpc("record_attendance", [id(4), id(21), "in"]), "FORBIDDEN");
  await rejects(() => rpc("record_attendance", [id(2), id(22), "in"]), "FORBIDDEN");
});
it("rejects reactivation at capacity and does not auto-reactivate on upgrade", async () => {
  await expire(); await selectFree();
  await rejects(() => db.exec(`update memberships set plan_disabled_at=null where id='${id(14)}'`), "EMPLOYEE_LIMIT_REACHED");
  await rpc("process_subscription_payment", ["upgrade", "tx", company, "business", 2900, 0, id(1)]);
  expect(await status()).toMatchObject({ active_employees: 3, effective_plan: "business" });
  await db.exec(`update memberships set plan_disabled_at=null where id='${id(14)}'`);
  expect(await status()).toMatchObject({ active_employees: 4 });
});
it("replays a completed selection after upgrade without changing paid subscription or choices", async () => {
  await expire(); await selectFree();
  await rpc("process_subscription_payment", ["upgrade", "tx", company, "business", 2900, 0, id(1)]);
  expect(await selectFree()).toMatchObject({ success: true, idempotent: true });
  expect(await status()).toMatchObject({ effective_plan: "business" });
  await rejects(() => selectFree([id(11)], id(21)), "INVALID_INPUT");
});
it("guards direct operational inserts as well as RPC commands", async () => {
  await expire(); await selectFree();
  await rejects(() => db.exec(`insert into shifts(company_id,branch_id,membership_id,starts_at,ends_at) values ('${company}','${id(21)}','${id(14)}',now(),now()+interval '8 hours')`), "FORBIDDEN");
  await rejects(() => rpc("record_advance", [id(1), id(14), 1000, "2026-01-01", "Test"]), "FORBIDDEN");
});
