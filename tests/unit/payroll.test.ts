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
  ok: (value: unknown) => Response.json(value),
  fail: (error: unknown) => {
    const code = error instanceof Error ? error.message : "INTERNAL";
    const status =
      code === "FORBIDDEN"
        ? 403
        : code === "UNAUTHENTICATED"
          ? 401
          : code === "INVALID_INPUT"
            ? 400
            : 500;
    return Response.json({ error: { code } }, { status });
  },
  readMutation: vi.fn(),
  rateLimit: dependencies.limit,
  databaseError: (msg?: string) => {
    throw new Error(msg || "INTERNAL");
  },
}));

import {
  recordSalaryAdvance,
  closePayrollPeriod,
} from "@/modules/organization/server/payroll";
import { POST } from "@/app/api/payroll/route";
import { readMutation } from "@/shared/server/http";

const memberId = "30000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.resetAllMocks();
  dependencies.session.mockResolvedValue({
    user: { id: actorId },
    client: {},
  });
  dependencies.rpc.mockResolvedValue({
    data: "adv-123",
    error: null,
  });
});

it("records salary advance with standard issuedOn date", async () => {
  const result = await recordSalaryAdvance({
    membershipId: memberId,
    amountQepik: 15000,
    issuedOn: "2026-11-03",
    note: "Təcili avans",
  });

  expect(result).toEqual({ id: "adv-123" });
  expect(dependencies.rpc).toHaveBeenCalledWith("record_advance", {
    p_actor: actorId,
    p_membership: memberId,
    p_amount_qepik: 15000,
    p_date: "2026-11-03",
    p_note: "Təcili avans",
  });
  expect(dependencies.limit).toHaveBeenCalledWith(`advance:${actorId}`, 20);
});

it("records salary advance when client submits date field", async () => {
  const result = await recordSalaryAdvance({
    membershipId: memberId,
    amountQepik: 5000,
    date: "2026-11-03",
  });

  expect(result).toEqual({ id: "adv-123" });
  expect(dependencies.rpc).toHaveBeenCalledWith("record_advance", {
    p_actor: actorId,
    p_membership: memberId,
    p_amount_qepik: 5000,
    p_date: "2026-11-03",
    p_note: null,
  });
});

it("rejects invalid advance input (negative or zero amount)", async () => {
  await expect(
    recordSalaryAdvance({
      membershipId: memberId,
      amountQepik: -100,
      issuedOn: "2026-11-03",
    }),
  ).rejects.toThrow("INVALID_INPUT");

  await expect(
    recordSalaryAdvance({
      membershipId: memberId,
      amountQepik: 0,
      issuedOn: "2026-11-03",
    }),
  ).rejects.toThrow("INVALID_INPUT");
});

it("rejects advance without date or issuedOn", async () => {
  await expect(
    recordSalaryAdvance({
      membershipId: memberId,
      amountQepik: 5000,
    }),
  ).rejects.toThrow("INVALID_INPUT");
});

it("closes payroll period with valid periodMonth", async () => {
  dependencies.rpc.mockResolvedValue({
    data: "period-999",
    error: null,
  });

  const result = await closePayrollPeriod({
    membershipId: memberId,
    periodMonth: "2026-11",
    overtimeQepik: 2000,
  });

  expect(result).toEqual({ id: "period-999" });
  expect(dependencies.rpc).toHaveBeenCalledWith("close_payroll_period", {
    p_actor: actorId,
    p_membership: memberId,
    p_month: "2026-11",
    p_overtime_qepik: 2000,
  });
});

it("rejects close payroll with invalid month format", async () => {
  await expect(
    closePayrollPeriod({
      membershipId: memberId,
      periodMonth: "2026/11",
      overtimeQepik: 0,
    }),
  ).rejects.toThrow("INVALID_INPUT");
});

it("dispatches POST /api/payroll to close period or advance", async () => {
  vi.mocked(readMutation).mockResolvedValueOnce({
    membershipId: memberId,
    periodMonth: "2026-11",
    overtimeQepik: 0,
  });

  const response1 = await POST(new Request("http://localhost/api/payroll", { method: "POST" }));
  expect(response1.status).toBe(200);

  vi.mocked(readMutation).mockResolvedValueOnce({
    membershipId: memberId,
    amountQepik: 10000,
    issuedOn: "2026-11-01",
  });

  const response2 = await POST(new Request("http://localhost/api/payroll", { method: "POST" }));
  expect(response2.status).toBe(200);
});
