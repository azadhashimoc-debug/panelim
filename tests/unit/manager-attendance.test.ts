import { createClient } from "@supabase/supabase-js";
import { beforeEach, expect, it, vi } from "vitest";

const context = vi.hoisted(() => ({
  session: vi.fn(),
  access: vi.fn(),
}));
vi.mock("@/modules/identity/server/session", () => ({
  requireSession: context.session,
}));
vi.mock("@/modules/organization/server/access", () => ({
  requireBranchAccess: context.access,
}));
vi.mock("@/modules/attendance/server/corrections", () => ({
  requestCorrection: vi.fn(),
  decideCorrection: vi.fn(),
}));
vi.mock("@/shared/server/http", () => ({
  ok: (value: unknown) => Response.json(value),
  fail: () => Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }),
  readMutation: vi.fn(),
}));
import { GET } from "@/app/api/corrections/route";

const branch = "20000000-0000-4000-8000-000000000001";
let urls: URL[];
beforeEach(() => {
  vi.resetAllMocks();
  urls = [];
  context.access.mockResolvedValue(undefined);
  const client = createClient("https://fixture.supabase.co", "fixture-key", {
    global: {
      fetch: async (input) => {
        urls.push(new URL(String(input)));
        return Response.json([]);
      },
    },
    auth: { persistSession: false },
  });
  context.session.mockResolvedValue({ client });
});

it("includes forgotten open attendance outside the recent window and prioritizes open rows", async () => {
  const response = await GET(
    new Request(`http://localhost/api/corrections?branch=${branch}`),
  );
  expect(response.status).toBe(200);
  const query = urls.find((url) =>
    url.pathname.endsWith("/attendance"),
  )!.searchParams;
  expect(query.get("branch_id")).toBe(`eq.${branch}`);
  expect(query.get("or")).toMatch(/^\(check_out\.is\.null,check_in\.gte\./);
  expect(query.has("check_in")).toBe(false);
  expect(query.get("order")).toMatch(
    /^check_out\.desc\.nullsfirst,check_in\.desc/,
  );
});

it("does not query records when branch management access is denied", async () => {
  context.access.mockRejectedValue(new Error("FORBIDDEN"));
  const response = await GET(
    new Request(`http://localhost/api/corrections?branch=${branch}`),
  );
  expect(response.status).toBe(403);
  expect(urls).toEqual([]);
});
