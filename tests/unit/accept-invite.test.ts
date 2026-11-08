import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const context = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  limit: vi.fn(),
  role: "employee" as string | null,
}));
vi.mock("@/infrastructure/supabase/server", () => {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    maybeSingle: async () => ({
      data: context.role ? { role: context.role, company_id: "c" } : null,
      error: null,
    }),
  };
  return {
    userClient: async () => ({
      auth: { verifyOtp: context.verifyOtp, updateUser: context.updateUser, signOut: context.signOut },
    }),
    serviceClient: () => ({ from: () => query }),
  };
});
vi.mock("@/shared/server/http", async (original) => ({
  ...(await original<typeof import("@/shared/server/http")>()),
  rateLimit: context.limit,
}));

import { POST } from "@/app/api/auth/route";

const TOKEN = "hashed-recovery-token-value";
const PASSWORD = "yeni-sifre-123";

function accept(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/auth", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ action: "accept_invite", ...body }),
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  context.role = "employee";
  context.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  context.updateUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  context.signOut.mockResolvedValue({ error: null });
});

it("sets the password and sends an employee to the employee screen", async () => {
  const response = await accept({ token: TOKEN, password: PASSWORD });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, redirect: "/isci" });
  expect(context.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: TOKEN });
  expect(context.updateUser).toHaveBeenCalledWith({ password: PASSWORD });
});

it("sends an owner to the manager screen", async () => {
  context.role = "owner";
  const response = await accept({ token: TOKEN, password: PASSWORD });
  expect(await response.json()).toMatchObject({ redirect: "/rehber" });
});

it("rejects a used or expired link without touching the password", async () => {
  context.verifyOtp.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
  const response = await accept({ token: TOKEN, password: PASSWORD });
  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("INVITE_INVALID");
  expect(context.updateUser).not.toHaveBeenCalled();
});

it("does not spend the one-time token on a password that is too short", async () => {
  const response = await accept({ token: TOKEN, password: "1234567" });
  expect(response.status).toBe(400);
  expect(context.verifyOtp).not.toHaveBeenCalled();
});

it("signs out and reports failure when the new password is refused", async () => {
  context.updateUser.mockResolvedValue({ data: { user: null }, error: { message: "weak_password" } });
  const response = await accept({ token: TOKEN, password: PASSWORD });
  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("INVITE_PASSWORD");
  expect(context.signOut).toHaveBeenCalledTimes(1);
});

it("applies rate limiting before the token is used", async () => {
  context.limit.mockRejectedValue(new Error("RATE_LIMITED"));
  const response = await accept({ token: TOKEN, password: PASSWORD });
  expect(response.status).toBe(429);
  expect(context.verifyOtp).not.toHaveBeenCalled();
});

it("rejects a cross-origin attempt", async () => {
  const response = await POST(
    new Request("http://localhost/api/auth", {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({ action: "accept_invite", token: TOKEN, password: PASSWORD }),
    }),
  );
  expect(response.status).toBe(403);
  expect(context.verifyOtp).not.toHaveBeenCalled();
});
