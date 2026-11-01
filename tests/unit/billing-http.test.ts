import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/identity/server/session", () => ({
  requireSession: async () => { throw new Error("UNAUTHENTICATED"); },
}));
import { GET, POST } from "@/app/api/billing/route";
import { GET as selectionGET, POST as selectionPOST } from "@/app/api/billing/selection/route";
it("does not reveal selection choices to anonymous callers", async () => {
  const response = await selectionGET();
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("rejects a cross-origin Free selection", async () => {
  const response = await selectionPOST(new Request("http://localhost/api/billing/selection", {
    method: "POST", headers: { origin: "https://untrusted.example", "content-type": "application/json" }, body: "{}",
  }));
  expect(response.status).toBe(403);
});
it("returns a private 401 response for unauthenticated billing reads", async () => {
  const response = await GET();
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
});
it("rejects cross-origin checkout before authentication or database work", async () => {
  const response = await POST(new Request("http://localhost/api/billing", {
    method: "POST", headers: { origin: "https://untrusted.example", "content-type": "application/json" }, body: JSON.stringify({ plan: "business" }),
  }));
  expect(response.status).toBe(403);
});
it("rejects oversized checkout requests", async () => {
  const response = await POST(new Request("http://localhost/api/billing", {
    method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ padding: "x".repeat(9000) }),
  }));
  expect(response.status).toBe(400);
});
it("does not expose a successful sandbox checkout to anonymous callers", async () => {
  const response = await POST(new Request("http://localhost/api/billing", {
    method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ plan: "business", idempotencyKey: "anonymous-checkout" }),
  }));
  expect(response.status).toBe(401);
});
