import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const context = vi.hoisted(() => ({
  access: vi.fn(),
}));

vi.mock("@/modules/organization/server/access", () => ({
  requireBranchAccess: context.access,
}));

vi.mock("@/shared/server/http", () => ({
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
}));

import { GET } from "@/app/api/attendance/export/route";

const branchId = "20000000-0000-4000-8000-000000000001";
const companyId = "a0000000-0000-4000-8000-000000000001";
const memberId = "30000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.resetAllMocks();
});

it("rejects export when branch query param is missing or not a uuid", async () => {
  const res1 = await GET(new Request("http://localhost/api/attendance/export"));
  expect(res1.status).toBe(400);

  const res2 = await GET(new Request("http://localhost/api/attendance/export?branch=invalid-id"));
  expect(res2.status).toBe(400);
});

it("rejects export when user lacks branch management access", async () => {
  context.access.mockRejectedValue(new Error("FORBIDDEN"));
  const res = await GET(new Request(`http://localhost/api/attendance/export?branch=${branchId}`));
  expect(res.status).toBe(403);
});

it("generates and returns CSV with UTF-8 BOM on successful export", async () => {
  const attendanceData = [
    {
      id: "att-1",
      membership_id: memberId,
      check_in: "2026-11-01T05:00:00.000Z",
      check_out: "2026-11-01T14:00:00.000Z",
      work_date: "2026-11-01",
      source: "qr",
      location_verified: true,
    },
  ];
  const membersData = [
    {
      id: memberId,
      display_name: 'Əli Məmmədov, "Kassir"',
    },
  ];

  const clientMock = {
    from: (table: string) => {
      if (table === "attendance") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({
                  limit: async () => ({ data: attendanceData, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async () => ({ data: membersData, error: null }),
        }),
      };
    },
  };

  context.access.mockResolvedValue({
    client: clientMock,
    branch: { id: branchId, company_id: companyId, name: "Nizami Filialı" },
  });

  const res = await GET(new Request(`http://localhost/api/attendance/export?branch=${branchId}`));
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("text/csv");
  expect(res.headers.get("content-disposition")).toContain("attachment; filename=");

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // UTF-8 BOM: 0xEF, 0xBB, 0xBF
  expect(bytes[0]).toBe(0xef);
  expect(bytes[1]).toBe(0xbb);
  expect(bytes[2]).toBe(0xbf);

  const text = new TextDecoder("utf-8").decode(buffer);
  expect(text).toContain("Tarix,İşçi,Filial,Giriş vaxtı,Çıxış vaxtı,İşlənmiş dəqiqə,Mənbə,Məkan yoxlaması");
  expect(text).toContain('"Əli Məmmədov, ""Kassir"""');
  expect(text).toContain("540"); // 9 hours = 540 minutes
  expect(text).toContain("QR kod");
  expect(text).toContain("Təsdiqlənib");
});
