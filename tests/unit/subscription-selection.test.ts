import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const dependencies = vi.hoisted(() => ({ owner: vi.fn(), rpc: vi.fn(), limit: vi.fn() }));
vi.mock("@/modules/organization/server/billing", () => ({ requireOwner: dependencies.owner }));
vi.mock("@/infrastructure/supabase/server", () => ({ serviceClient: () => ({ rpc: dependencies.rpc }) }));
vi.mock("@/shared/server/http", () => ({ rateLimit: dependencies.limit, databaseError: (message: string) => { throw new Error(message); } }));
import { completeFreeSelection } from "@/modules/organization/server/subscription-selection";
const owner = "10000000-0000-4000-8000-000000000001";
const branch = "20000000-0000-4000-8000-000000000001";
const input = { memberIds: [owner], branchId: branch, idempotencyKey: "selection-key" };
beforeEach(() => {
  vi.resetAllMocks();
  dependencies.owner.mockResolvedValue({ actorId: owner, companyId: "a0000000-0000-4000-8000-000000000001" });
  dependencies.rpc.mockResolvedValue({ data: { success: true, idempotent: false }, error: null });
});
it("requires an owner session before completing the selection", async () => {
  dependencies.owner.mockRejectedValue(new Error("FORBIDDEN"));
  await expect(completeFreeSelection(input)).rejects.toThrow("FORBIDDEN");
});
it("rejects empty, duplicated, oversized and untrusted-company input", async () => {
  for (const invalid of [
    { ...input, memberIds: [] }, { ...input, memberIds: [owner, owner] },
    { ...input, memberIds: [owner, branch, branch, owner] }, { ...input, branchId: "bad" },
    { ...input, idempotencyKey: " " }, { ...input, companyId: "untrusted" },
  ]) await expect(completeFreeSelection(invalid)).rejects.toThrow("INVALID_INPUT");
});
it("preserves selection conflicts and rate limits without confirming success", async () => {
  dependencies.rpc.mockResolvedValue({ data: null, error: { message: "PLAN_SELECTION_REQUIRED" } });
  await expect(completeFreeSelection(input)).rejects.toThrow("PLAN_SELECTION_REQUIRED");
  dependencies.limit.mockRejectedValue(new Error("RATE_LIMITED"));
  await expect(completeFreeSelection(input)).rejects.toThrow("RATE_LIMITED");
});
it("only confirms a valid persisted RPC result including retries", async () => {
  await expect(completeFreeSelection(input)).resolves.toEqual({ ok: true, success: true, idempotent: false });
  dependencies.rpc.mockResolvedValue({ data: { success: true, idempotent: true }, error: null });
  await expect(completeFreeSelection(input)).resolves.toMatchObject({ success: true, idempotent: true });
  dependencies.rpc.mockResolvedValue({ data: {}, error: null });
  await expect(completeFreeSelection(input)).rejects.toThrow("INTERNAL");
});
