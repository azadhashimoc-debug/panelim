import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Row = Record<string, unknown>;
const context = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  currentUserId: "",
  generateLink: vi.fn(),
  getUserById: vi.fn(),
  limit: vi.fn(),
  inserted: [] as { table: string; row: Record<string, unknown> }[],
}));

/** Süzgəcləri həqiqətən tətbiq edən kiçik yaddaş bazası: səlahiyyət testləri mock-a yox, sorğuya baxır. */
function table(name: string) {
  const filters: ((row: Row) => boolean)[] = [];
  const rows = () => (context.tables[name] ?? []).filter((r) => filters.every((f) => f(r)));
  const query = {
    select: () => query,
    eq: (col: string, val: unknown) => (filters.push((r) => r[col] === val), query),
    neq: (col: string, val: unknown) => (filters.push((r) => r[col] !== val), query),
    is: (col: string, val: unknown) => (filters.push((r) => (r[col] ?? null) === val), query),
    in: (col: string, vals: unknown[]) => (filters.push((r) => vals.includes(r[col])), query),
    order: () => query,
    limit: () => query,
    maybeSingle: async () => {
      const found = rows();
      return found.length > 1
        ? { data: null, error: { message: "multiple rows" } }
        : { data: found[0] ?? null, error: null };
    },
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
      resolve({ data: rows(), error: null }),
    insert: async (row: Row) => {
      context.inserted.push({ table: name, row });
      return { error: null };
    },
  };
  return query;
}

vi.mock("@/modules/identity/server/session", () => ({
  requireSession: async () => {
    if (!context.currentUserId) throw new Error("UNAUTHENTICATED");
    return { user: { id: context.currentUserId }, client: { from: table } };
  },
}));
vi.mock("@/infrastructure/supabase/server", () => ({
  serviceClient: () => ({
    from: table,
    auth: { admin: { generateLink: context.generateLink, getUserById: context.getUserById } },
  }),
}));
vi.mock("@/shared/server/http", async (original) => ({
  ...(await original<typeof import("@/shared/server/http")>()),
  rateLimit: context.limit,
}));

import { POST } from "@/app/api/rehber/route";

const COMPANY = "a0000000-0000-4000-8000-000000000001";
const OTHER_COMPANY = "a0000000-0000-4000-8000-000000000002";
const BRANCH_A = "b0000000-0000-4000-8000-00000000000a";
const BRANCH_B = "b0000000-0000-4000-8000-00000000000b";
const id = (n: number) => `c0000000-0000-4000-8000-00000000000${n}`;
const uid = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;
const OWNER = 1, MANAGER = 2, EMPLOYEE_A = 3, EMPLOYEE_B = 4, ACCOUNTANT = 5, OTHER_MANAGER = 6, ARCHIVED = 7, MULTI = 8;

function member(n: number, role: string, extra: Row = {}) {
  return { id: id(n), user_id: uid(n), company_id: COMPANY, role, display_name: `User ${n}`, archived_at: null, ...extra };
}

function callCreateLink(membershipId: string) {
  return POST(
    new Request("http://localhost/api/rehber", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ action: "create_access_link", membershipId }),
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "https://panelim.az");
  context.inserted.length = 0;
  context.currentUserId = uid(OWNER);
  context.tables = {
    memberships: [
      member(OWNER, "owner"),
      member(MANAGER, "manager"),
      member(EMPLOYEE_A, "employee"),
      member(EMPLOYEE_B, "employee"),
      member(ACCOUNTANT, "accountant"),
      member(OTHER_MANAGER, "manager"),
      member(ARCHIVED, "employee", { archived_at: "2026-01-01T00:00:00Z" }),
      member(MULTI, "employee"),
      { ...member(MULTI, "owner"), id: "c0000000-0000-4000-8000-000000000099", company_id: OTHER_COMPANY },
      { ...member(9, "employee"), company_id: OTHER_COMPANY },
    ],
    branch_assignments: [
      { membership_id: id(MANAGER), branch_id: BRANCH_A, company_id: COMPANY },
      { membership_id: id(EMPLOYEE_A), branch_id: BRANCH_A, company_id: COMPANY },
      { membership_id: id(EMPLOYEE_B), branch_id: BRANCH_B, company_id: COMPANY },
      { membership_id: id(ACCOUNTANT), branch_id: BRANCH_A, company_id: COMPANY },
      { membership_id: id(OTHER_MANAGER), branch_id: BRANCH_A, company_id: COMPANY },
    ],
    branches: [{ id: BRANCH_A, company_id: COMPANY, archived_at: null }],
    audit_events: [],
  };
  context.getUserById.mockImplementation(async (userId: string) => ({
    data: { user: { id: userId, email: `user-${userId.slice(-1)}@biznes.az` } },
    error: null,
  }));
  context.generateLink.mockResolvedValue({
    data: { properties: { hashed_token: "hashed-recovery-token-value" }, user: {} },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

async function expectForbidden(membershipId: string) {
  const response = await callCreateLink(membershipId);
  expect(response.status).toBe(403);
  expect(context.generateLink).not.toHaveBeenCalled();
}

it("gives an owner a one-time link for their employee, with the token only in the URL fragment", async () => {
  const response = await callCreateLink(id(EMPLOYEE_A));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.url).toBe("https://panelim.az/davet#t=hashed-recovery-token-value");
  expect(context.generateLink).toHaveBeenCalledWith({ type: "recovery", email: "user-3@biznes.az" });
});

it("records who created the link in the audit trail without storing the token", async () => {
  await callCreateLink(id(EMPLOYEE_A));
  expect(context.inserted).toHaveLength(1);
  const { table: name, row } = context.inserted[0];
  expect(name).toBe("audit_events");
  expect(row).toMatchObject({
    company_id: COMPANY,
    branch_id: BRANCH_A,
    actor_id: uid(OWNER),
    action: "employee.access_link_created",
    entity_id: id(EMPLOYEE_A),
  });
  expect(JSON.stringify(row)).not.toContain("hashed-recovery-token-value");
});

it("does not return a link when the audit record cannot be written", async () => {
  context.tables.branch_assignments = [];
  context.tables.branches = [];
  const response = await callCreateLink(id(EMPLOYEE_A));
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("hashed-recovery-token-value");
});

it("never lets anyone create a link for an owner", async () => {
  await expectForbidden(id(OWNER));
  context.currentUserId = uid(MANAGER);
  await expectForbidden(id(OWNER));
});

it("does not reach employees of another company", async () => {
  await expectForbidden(id(9));
});

it("does not reach archived employees", async () => {
  await expectForbidden(id(ARCHIVED));
});

it("refuses a user who is active in another company, where the link would open that account too", async () => {
  await expectForbidden(id(MULTI));
});

it("lets a manager reach an employee in their own branch", async () => {
  context.currentUserId = uid(MANAGER);
  expect((await callCreateLink(id(EMPLOYEE_A))).status).toBe(200);
});

it("keeps a manager out of another branch", async () => {
  context.currentUserId = uid(MANAGER);
  await expectForbidden(id(EMPLOYEE_B));
});

it("keeps a manager away from other managers, accountants, and their own account", async () => {
  context.currentUserId = uid(MANAGER);
  await expectForbidden(id(OTHER_MANAGER));
  await expectForbidden(id(ACCOUNTANT));
  await expectForbidden(id(MANAGER));
});

it("refuses plain employees", async () => {
  context.currentUserId = uid(EMPLOYEE_A);
  await expectForbidden(id(EMPLOYEE_B));
});

it("rejects anonymous callers", async () => {
  context.currentUserId = "";
  const response = await callCreateLink(id(EMPLOYEE_A));
  expect(response.status).toBe(401);
  expect(context.generateLink).not.toHaveBeenCalled();
});

it("does not issue a link pointing nowhere when APP_URL is missing", async () => {
  vi.stubEnv("APP_URL", "");
  const response = await callCreateLink(id(EMPLOYEE_A));
  expect(response.status).toBe(503);
  expect(context.generateLink).not.toHaveBeenCalled();
});

it("reports a Supabase failure instead of returning a broken link", async () => {
  context.generateLink.mockResolvedValue({ data: { properties: null, user: null }, error: { message: "down" } });
  const response = await callCreateLink(id(EMPLOYEE_A));
  expect(response.status).toBe(500);
  expect(context.inserted).toHaveLength(0);
});
