import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const deps = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  membershipData: { current: null as Record<string, unknown> | null },
}));

vi.mock("@/infrastructure/supabase/server", () => ({
  userClient: async () => ({
    auth: {
      signUp: deps.signUp,
      signInWithPassword: deps.signInWithPassword,
      getUser: deps.getUser,
      signOut: deps.signOut,
    },
  }),
  serviceClient: () => ({
    rpc: deps.rpc,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            maybeSingle: async () => ({
              data: table === "memberships" ? deps.membershipData.current : null,
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { POST } from "@/app/api/auth/route";

beforeEach(() => {
  deps.membershipData.current = null;
  deps.signUp.mockResolvedValue({
    data: {
      user: { id: "10000000-0000-4000-8000-000000000001" },
      session: null,
    },
    error: null,
  });
  deps.signInWithPassword.mockResolvedValue({
    data: {
      user: { id: "10000000-0000-4000-8000-000000000001" },
      session: { access_token: "mock-token" },
    },
    error: null,
  });
  deps.getUser.mockResolvedValue({
    data: { user: { id: "10000000-0000-4000-8000-000000000001" } },
    error: null,
  });
  deps.rpc.mockImplementation(async (name: string) =>
    name === "consume_rate_limit"
      ? { data: true, error: null }
      : { data: null, error: { message: "database unavailable" } },
  );
});

function registerRequest(bodyOverides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({
      action: "register",
      email: "owner@example.com",
      password: "password123",
      displayName: "Owner Name",
      companyName: "Company",
      ...bodyOverides,
    }),
  });
}

it("does not report company registration success after a failed transaction", async () => {
  const response = await POST(registerRequest());
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ error: { code: "INTERNAL" } });
});

it("reports email confirmation when signup has no session", async () => {
  deps.rpc.mockResolvedValue({ data: { success: true }, error: null });
  const response = await POST(registerRequest());
  expect(await response.json()).toMatchObject({
    success: true,
    requiresEmailConfirmation: false,
  });
});

it("recovers registration when user exists in auth but has no company membership", async () => {
  deps.signUp.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: "User already registered" },
  });
  deps.rpc.mockImplementation(async (name: string) =>
    name === "consume_rate_limit"
      ? { data: true, error: null }
      : { data: { success: true, company_id: "c-1" }, error: null },
  );

  const response = await POST(registerRequest());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    recovered: true,
  });
});

it("rejects registration recovery when existing user password is incorrect", async () => {
  deps.signUp.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: "User already registered" },
  });
  deps.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: "Invalid login credentials" },
  });

  const response = await POST(registerRequest());
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    error: { code: "ALREADY_EXISTS" },
  });
});

it("rejects registration recovery when existing user already has a company membership", async () => {
  deps.signUp.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: "User already registered" },
  });
  deps.membershipData.current = {
    id: "m-1",
    company_id: "c-1",
    role: "owner",
  };

  const response = await POST(registerRequest());
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    error: { code: "ALREADY_EXISTS" },
  });
});

it("allows authenticated user without company to complete setup via complete_setup", async () => {
  deps.rpc.mockImplementation(async (name: string) =>
    name === "consume_rate_limit"
      ? { data: true, error: null }
      : { data: { success: true, company_id: "c-1" }, error: null },
  );

  const request = new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({
      action: "complete_setup",
      companyName: "Yeni Kafe",
      displayName: "Rəhbər Sahib",
      branchName: "Mərkəz",
    }),
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true });
});

it("rejects complete_setup if user already has an active company membership", async () => {
  deps.membershipData.current = {
    id: "m-1",
    company_id: "c-1",
    role: "owner",
  };

  const request = new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({
      action: "complete_setup",
      companyName: "Yeni Kafe",
      displayName: "Rəhbər Sahib",
    }),
  });

  const response = await POST(request);
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    error: { code: "ALREADY_EXISTS" },
  });
});

it("login indicates needsSetup: true when user has no active company membership", async () => {
  const request = new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({
      action: "login",
      email: "owner@example.com",
      password: "password123",
    }),
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    success: true,
    needsSetup: true,
    redirect: "/qeydiyyat?qurulum=davam",
  });
});
