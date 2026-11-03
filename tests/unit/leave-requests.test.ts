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
  requestLeave,
  decideLeave,
} from "@/modules/attendance/server/leave-requests";
import { GET, POST } from "@/app/api/leave-requests/route";
import { readMutation } from "@/shared/server/http";

const actorId = "10000000-0000-4000-8000-000000000001";
const leaveId = "40000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.resetAllMocks();
  dependencies.session.mockResolvedValue({
    user: { id: actorId },
    client: {},
  });
  dependencies.rpc.mockResolvedValue({
    data: leaveId,
    error: null,
  });
});

it("submits leave request with startsOn and endsOn", async () => {
  const result = await requestLeave({
    type: "leave",
    startsOn: "2026-11-10",
    endsOn: "2026-11-15",
    reason: "Ailəvi səbəblə məzuniyyət",
  });

  expect(result).toEqual({ id: leaveId });
  expect(dependencies.rpc).toHaveBeenCalledWith("request_leave", {
    p_actor: actorId,
    p_type: "leave",
    p_start: "2026-11-10",
    p_end: "2026-11-15",
    p_reason: "Ailəvi səbəblə məzuniyyət",
  });
});

it("submits leave request with start and end from HTML form fields", async () => {
  const result = await requestLeave({
    type: "permission",
    start: "2026-11-10",
    end: "2026-11-10",
    reason: "Həkim müayinəsi",
  });

  expect(result).toEqual({ id: leaveId });
  expect(dependencies.rpc).toHaveBeenCalledWith("request_leave", {
    p_actor: actorId,
    p_type: "permission",
    p_start: "2026-11-10",
    p_end: "2026-11-10",
    p_reason: "Həkim müayinəsi",
  });
});

it("rejects leave request with invalid type or too short reason", async () => {
  await expect(
    requestLeave({
      type: "vacation",
      startsOn: "2026-11-10",
      endsOn: "2026-11-15",
      reason: "Qısa",
    }),
  ).rejects.toThrow("INVALID_INPUT");

  await expect(
    requestLeave({
      type: "leave",
      startsOn: "2026-11-10",
      endsOn: "2026-11-15",
      reason: "a",
    }),
  ).rejects.toThrow("INVALID_INPUT");
});

it("approves leave request using id", async () => {
  const result = await decideLeave({
    id: leaveId,
    decision: "approved",
    reason: "Qrafikə uyğundur, təsdiqləndi",
  });

  expect(result).toEqual({ id: leaveId });
  expect(dependencies.rpc).toHaveBeenCalledWith("decide_leave", {
    p_actor: actorId,
    p_id: leaveId,
    p_decision: "approved",
    p_reason: "Qrafikə uyğundur, təsdiqləndi",
  });
});

it("rejects leave request using requestId", async () => {
  const result = await decideLeave({
    requestId: leaveId,
    decision: "rejected",
    reason: "Əvəzedici işçi olmadığı üçün rədd edildi",
  });

  expect(result).toEqual({ id: leaveId });
  expect(dependencies.rpc).toHaveBeenCalledWith("decide_leave", {
    p_actor: actorId,
    p_id: leaveId,
    p_decision: "rejected",
    p_reason: "Əvəzedici işçi olmadığı üçün rədd edildi",
  });
});

it("rejects leave decision with empty reason or invalid decision", async () => {
  await expect(
    decideLeave({
      id: leaveId,
      decision: "maybe",
      reason: "Gözləyirəm",
    }),
  ).rejects.toThrow("INVALID_INPUT");

  await expect(
    decideLeave({
      id: leaveId,
      decision: "approved",
      reason: "no",
    }),
  ).rejects.toThrow("INVALID_INPUT");
});

it("dispatches POST /api/leave-requests correctly", async () => {
  vi.mocked(readMutation).mockResolvedValueOnce({
    requestId: leaveId,
    decision: "approved",
    reason: "Təsdiqləndi",
  });

  const res1 = await POST(new Request("http://localhost/api/leave-requests", { method: "POST" }));
  expect(res1.status).toBe(200);

  vi.mocked(readMutation).mockResolvedValueOnce({
    type: "permission",
    startsOn: "2026-11-04",
    endsOn: "2026-11-04",
    reason: "Şəxsi iş",
  });

  const res2 = await POST(new Request("http://localhost/api/leave-requests", { method: "POST" }));
  expect(res2.status).toBe(200);
});

it("protects GET /api/leave-requests against unauthorized roles", async () => {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    in: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  dependencies.session.mockResolvedValueOnce({
    user: { id: actorId },
    client: { from: () => query },
  });

  const res = await GET();
  expect(res.status).toBe(403);
});
