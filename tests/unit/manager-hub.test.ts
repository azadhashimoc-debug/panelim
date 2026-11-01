import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const context = vi.hoisted(() => ({
  session: vi.fn(),
  adminCreateUser: vi.fn(),
  serviceFrom: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/modules/identity/server/session", () => ({
  requireSession: context.session,
}));

vi.mock("@/infrastructure/supabase/server", () => ({
  serviceClient: () => ({
    auth: {
      admin: {
        createUser: context.adminCreateUser,
      },
    },
    from: context.serviceFrom,
  }),
}));

vi.mock("@/shared/server/http", () => ({
  ok: (value: unknown) => Response.json(value),
  fail: (error: unknown) => {
    const code = error instanceof Error ? error.message : "INTERNAL";
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHENTICATED" ? 401 : code === "INVALID_INPUT" ? 400 : 500;
    return Response.json({ error: { code } }, { status });
  },
  readMutation: vi.fn(),
  rateLimit: context.limit,
}));

import { GET, POST } from "@/app/api/rehber/route";
import { readMutation } from "@/shared/server/http";

const companyId = "a0000000-0000-4000-8000-000000000001";
const ownerId = "10000000-0000-4000-8000-000000000001";
const branchId = "20000000-0000-4000-8000-000000000001";
const membershipId = "30000000-0000-4000-8000-000000000001";

type QueryMock = {
  select: () => QueryMock;
  eq: () => QueryMock;
  is: () => QueryMock;
  in: () => QueryMock;
  gte: () => QueryMock;
  order: () => QueryMock;
  limit: () => QueryMock;
  single: () => Promise<{ data: unknown; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  insert: () => QueryMock;
  then: (resolve: (val: { data: unknown; error: null }) => unknown) => unknown;
};

function createMockQuery(overrideData?: unknown): QueryMock {
  const query: QueryMock = {
    select: () => query,
    eq: () => query,
    is: () => query,
    in: () => query,
    gte: () => query,
    order: () => query,
    limit: () => query,
    single: async () => ({
      data: overrideData !== undefined ? overrideData : { id: "mock-id", name: "Nizami Kafe" },
      error: null,
    }),
    maybeSingle: async () => ({
      data: overrideData !== undefined ? overrideData : { id: membershipId, company_id: companyId, role: "owner", display_name: "Rəhbər" },
      error: null,
    }),
    insert: () => query,
    then: (resolve) =>
      resolve({ data: Array.isArray(overrideData) ? overrideData : [], error: null }),
  };
  return query;
}

beforeEach(() => {
  vi.resetAllMocks();
  context.session.mockResolvedValue({
    client: { from: () => createMockQuery({ id: membershipId, company_id: companyId, role: "owner", display_name: "Rəhbər" }) },
    user: { id: ownerId },
  });
  context.adminCreateUser.mockResolvedValue({
    data: { user: { id: "10000000-0000-4000-8000-000000000099" } },
    error: null,
  });
  context.serviceFrom.mockImplementation((table: string) => {
    if (table === "companies") {
      return createMockQuery({ id: companyId, name: "Nizami Kafe" });
    }
    return createMockQuery();
  });
});

it("rejects GET request if user is not a manager or owner", async () => {
  context.session.mockResolvedValue({
    client: { from: () => createMockQuery(null) }, // no manager membership
    user: { id: ownerId },
  });

  const response = await GET();
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
});

it("returns hub data for authenticated manager or owner", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty("company");
  expect(data).toHaveProperty("member");
  expect(data).toHaveProperty("branches");
  expect(data).toHaveProperty("team");
  expect(data).toHaveProperty("shifts");
  expect(data).toHaveProperty("leaveRequests");
  expect(data).toHaveProperty("corrections");
  expect(data).toHaveProperty("advances");
  expect(data).toHaveProperty("payrollPeriods");
  expect(data).toHaveProperty("todayAttendance");
});

it("adds employee when valid input is provided by owner", async () => {
  vi.mocked(readMutation).mockResolvedValue({
    action: "add_employee",
    displayName: "Aydın Məmmədov",
    email: "aydin@kafe.az",
    role: "employee",
    branchId,
    payType: "monthly",
    basePayQepik: 85000,
    paydayDay: 5,
  });

  const response = await POST(new Request("http://localhost/api/rehber", { method: "POST" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true });
});

it("rejects employee addition with invalid input", async () => {
  vi.mocked(readMutation).mockResolvedValue({
    action: "add_employee",
    displayName: "A", // too short
    email: "bad-email",
    role: "employee",
    branchId,
  });

  const response = await POST(new Request("http://localhost/api/rehber", { method: "POST" }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "INVALID_INPUT" } });
});

it("adds branch when valid branch details provided by owner", async () => {
  vi.mocked(readMutation).mockResolvedValue({
    action: "add_branch",
    name: "Yasamal filialı",
    latitude: 40.38,
    longitude: 49.82,
    radiusM: 100,
  });

  const response = await POST(new Request("http://localhost/api/rehber", { method: "POST" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true });
});

it("adds shift when valid schedule details provided", async () => {
  vi.mocked(readMutation).mockResolvedValue({
    action: "add_shift",
    membershipId,
    branchId,
    startsAt: "2026-11-02T09:00:00.000Z",
    endsAt: "2026-11-02T18:00:00.000Z",
  });

  const response = await POST(new Request("http://localhost/api/rehber", { method: "POST" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true });
});
