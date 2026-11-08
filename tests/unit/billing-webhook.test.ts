import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const dependencies = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/infrastructure/supabase/server", () => {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({
      data: { user_id: "10000000-0000-4000-8000-000000000001" },
      error: null,
    }),
  };
  return {
    serviceClient: () => ({ from: () => query, rpc: dependencies.rpc }),
    userClient: vi.fn(),
  };
});
import { GET, POST } from "@/app/api/billing/webhook/route";
import {
  createPaycellOrderId,
  verifyPaycellOrderId,
} from "@/modules/organization/server/billing";

const COMPANY = "a0000000-0000-4000-8000-000000000001";
const KEY = "test-paycell-webhook-key-0123456789";
const BASE = "https://panelim.az/api/billing/webhook";

function getWebhook(params: Record<string, string>) {
  return GET(
    new Request(`${BASE}?${new URLSearchParams(params).toString()}`, {
      headers: { accept: "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  dependencies.rpc.mockResolvedValue({
    data: { success: true, transaction_id: "tx", idempotent: false },
    error: null,
  });
  vi.stubEnv("QR_SIGNING_SECRET", "test-order-signing-secret");
  vi.stubEnv("PAYCELL_WEBHOOK_KEY", KEY);
});
afterEach(() => vi.unstubAllEnvs());

it("does not activate a plan from a customer's own order_id without the webhook key", async () => {
  const orderId = createPaycellOrderId(COMPANY, "start", 0);
  const response = await getWebhook({ order_id: orderId });
  expect(response.status).toBe(403);
  expect(dependencies.rpc).not.toHaveBeenCalled();
});

it("rejects a wrong webhook key", async () => {
  const orderId = createPaycellOrderId(COMPANY, "start", 0);
  const response = await getWebhook({ order_id: orderId, key: "wrong" });
  expect(response.status).toBe(403);
  expect(dependencies.rpc).not.toHaveBeenCalled();
});

it("stays closed when no webhook key is configured, even for an empty key", async () => {
  vi.stubEnv("PAYCELL_WEBHOOK_KEY", "");
  const orderId = createPaycellOrderId(COMPANY, "start", 0);
  const response = await getWebhook({ order_id: orderId, key: "" });
  expect(response.status).toBe(503);
  expect(dependencies.rpc).not.toHaveBeenCalled();
});

it("activates the signed plan at its price when Paycell calls with the key", async () => {
  const orderId = createPaycellOrderId(COMPANY, "business", 1);
  const response = await getWebhook({ order_id: orderId, key: KEY });
  expect(response.status).toBe(200);
  expect(dependencies.rpc).toHaveBeenCalledTimes(1);
  expect(dependencies.rpc).toHaveBeenCalledWith(
    "process_subscription_payment",
    expect.objectContaining({
      p_company_id: COMPANY,
      p_plan: "business",
      p_amount_qepik: 3400,
      p_extra_branches: 1,
      p_provider_tx_id: orderId,
    }),
  );
});

it("rejects a tampered order_id even with the key", async () => {
  const orderId = createPaycellOrderId(COMPANY, "start", 0).replace("start", "growth");
  const response = await getWebhook({ order_id: orderId, key: KEY });
  expect(response.status).toBe(403);
  expect(dependencies.rpc).not.toHaveBeenCalled();
});

it("requires the key on POST callbacks too", async () => {
  const orderId = createPaycellOrderId(COMPANY, "start", 0);
  const form = () => ({
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ order_id: orderId }).toString(),
  });
  const rejected = await POST(new Request(BASE, form()));
  expect(rejected.status).toBe(403);
  expect(dependencies.rpc).not.toHaveBeenCalled();
  const accepted = await POST(new Request(`${BASE}?key=${KEY}`, form()));
  expect(accepted.status).toBe(200);
  expect(dependencies.rpc).toHaveBeenCalledTimes(1);
});

it("rejects a callback reporting less than the plan price", async () => {
  // Paycell ödəniş URL-i imzasızdır: müştəri amount-u URL-də dəyişə bilər
  const orderId = createPaycellOrderId(COMPANY, "start", 0);
  const response = await getWebhook({ order_id: orderId, key: KEY, amount: "1.00" });
  expect(response.status).toBe(403);
  expect(dependencies.rpc).not.toHaveBeenCalled();
});

it("accepts a callback reporting the exact plan price", async () => {
  const orderId = createPaycellOrderId(COMPANY, "start", 0);
  const response = await getWebhook({ order_id: orderId, key: KEY, amount: "15.00" });
  expect(response.status).toBe(200);
  expect(dependencies.rpc).toHaveBeenCalledTimes(1);
});

it("does not accept an order signed with the old hardcoded fallback secret", () => {
  vi.stubEnv("QR_SIGNING_SECRET", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  const ts = Math.floor(Date.now() / 1000).toString(36);
  const payload = `${COMPANY}_growth_0_${ts}`;
  const sig = createHmac("sha256", "panelim-paycell-signing-secret-v1")
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  expect(verifyPaycellOrderId(`sub_${payload}_${sig}`)).toBeNull();
});
