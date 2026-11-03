import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const dependencies = vi.hoisted(() => ({
  session: vi.fn(),
  rpc: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/modules/identity/server/session", () => ({
  requireSession: dependencies.session,
}));
vi.mock("@/infrastructure/supabase/server", () => ({
  serviceClient: () => ({ rpc: dependencies.rpc }),
}));
vi.mock("@/shared/server/http", () => ({
  rateLimit: dependencies.limit,
  databaseError: () => {
    throw new Error("INTERNAL");
  },
}));
import {
  createPaycellCheckout,
  createPaycellOrderId,
  fetchSubscriptionStatus,
  processSandboxCheckout,
  verifyPaycellOrderId,
} from "@/modules/organization/server/billing";

function memberSession(role = "owner") {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    maybeSingle: async () => ({
      data: { company_id: "a0000000-0000-4000-8000-000000000001", role },
      error: null,
    }),
  };
  return {
    user: { id: "10000000-0000-4000-8000-000000000001" },
    client: { from: () => query },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  dependencies.session.mockResolvedValue(memberSession());
  dependencies.rpc.mockResolvedValue({
    data: { success: true, transaction_id: "tx", idempotent: false },
    error: null,
  });
});
it("rejects checkout when session verification fails", async () => {
  dependencies.session.mockRejectedValue(new Error("UNAUTHENTICATED"));
  await expect(
    processSandboxCheckout({ plan: "business", idempotencyKey: "checkout-1" }),
  ).rejects.toThrow("UNAUTHENTICATED");
});
it("rejects subscription reads without a session", async () => {
  dependencies.session.mockRejectedValue(new Error("UNAUTHENTICATED"));
  await expect(fetchSubscriptionStatus()).rejects.toThrow("UNAUTHENTICATED");
});
it("rejects employee checkout", async () => {
  dependencies.session.mockResolvedValue(memberSession("employee"));
  await expect(
    processSandboxCheckout({ plan: "business", idempotencyKey: "checkout-2" }),
  ).rejects.toThrow("FORBIDDEN");
});
it("does not turn database failure into payment success", async () => {
  dependencies.rpc.mockResolvedValue({
    data: null,
    error: { message: "database unavailable" },
  });
  await expect(
    processSandboxCheckout({ plan: "business", idempotencyKey: "checkout-3" }),
  ).rejects.toThrow("INTERNAL");
});
it("preserves rate limiting errors", async () => {
  dependencies.limit.mockRejectedValue(new Error("RATE_LIMITED"));
  await expect(
    processSandboxCheckout({ plan: "business", idempotencyKey: "checkout-4" }),
  ).rejects.toThrow("RATE_LIMITED");
});
it("requires an idempotency key for checkout retries", async () => {
  await expect(processSandboxCheckout({ plan: "business" })).rejects.toThrow(
    "INVALID_INPUT",
  );
});
it("does not return trial data on a failed subscription read", async () => {
  dependencies.rpc.mockResolvedValue({
    data: null,
    error: { message: "unavailable" },
  });
  await expect(fetchSubscriptionStatus()).rejects.toThrow("INTERNAL");
});
it("does not report a failed Free switch as success", async () => {
  dependencies.rpc.mockResolvedValue({
    data: null,
    error: { message: "unavailable" },
  });
  await expect(
    processSandboxCheckout({ plan: "free", idempotencyKey: "free-1" }),
  ).rejects.toThrow("INTERNAL");
});
it("only confirms a persisted successful RPC result", async () => {
  await expect(
    processSandboxCheckout({ plan: "business", idempotencyKey: "valid-1" }),
  ).resolves.toEqual({
    ok: true,
    success: true,
    transactionId: "tx",
    idempotent: false,
  });
  dependencies.rpc.mockResolvedValue({ data: {}, error: null });
  await expect(
    processSandboxCheckout({ plan: "business", idempotencyKey: "valid-2" }),
  ).rejects.toThrow("INTERNAL");
});

it("generates a real signed Paycell.az checkout URL and verifies order_id HMAC", async () => {
  const result = await createPaycellCheckout(
    {
      mode: "paycell",
      plan: "business",
      extraBranches: 1,
      idempotencyKey: "paycell-1",
    },
    "https://panelim.az",
  );
  expect(result.ok).toBe(true);
  expect(result.amountAzn).toBe(34);
  expect(result.checkoutUrl).toContain("https://paycell.az/pay/?");
  expect(result.checkoutUrl).toContain("site=panelim.az");
  expect(result.checkoutUrl).toContain("amount=34");
  expect(verifyPaycellOrderId(result.orderId)).toEqual({
    companyId: "a0000000-0000-4000-8000-000000000001",
    plan: "business",
    extraBranches: 1,
  });
  expect(verifyPaycellOrderId(`${result.orderId}tampered`)).toBeNull();
  const expiredOrder = createPaycellOrderId(
    "a0000000-0000-4000-8000-000000000001",
    "start",
    0,
    Date.now() - 90_000_000,
  );
  expect(verifyPaycellOrderId(expiredOrder)).toBeNull();
});
