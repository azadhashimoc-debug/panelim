import { requireBranchAccess } from "@/modules/organization/server/access";
import { fail } from "@/shared/server/http";
import { z } from "zod";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const branchId = url.searchParams.get("branch");
    if (!branchId || !z.uuid().safeParse(branchId).success) {
      throw new Error("INVALID_INPUT");
    }

    const { client, branch } = await requireBranchAccess(branchId, "manage");

    const [attendanceRes, membersRes] = await Promise.all([
      client
        .from("attendance")
        .select("id, membership_id, check_in, check_out, work_date, source, location_verified")
        .eq("branch_id", branchId)
        .order("work_date", { ascending: false })
        .order("check_in", { ascending: false })
        .limit(1000),
      client
        .from("memberships")
        .select("id, display_name")
        .eq("company_id", branch.company_id),
    ]);

    if (attendanceRes.error || membersRes.error) {
      throw new Error("INTERNAL");
    }

    const memberMap = new Map<string, string>();
    for (const m of membersRes.data || []) {
      memberMap.set(m.id, m.display_name);
    }

    const headers = [
      "Tarix",
      "İşçi",
      "Filial",
      "Giriş vaxtı",
      "Çıxış vaxtı",
      "İşlənmiş dəqiqə",
      "Mənbə",
      "Məkan yoxlaması",
    ];

    const rows = (attendanceRes.data || []).map((row) => {
      const minutes = row.check_out
        ? Math.round((new Date(row.check_out).getTime() - new Date(row.check_in).getTime()) / 60000)
        : "";
      return [
        escapeCsv(row.work_date),
        escapeCsv(memberMap.get(row.membership_id) || "İşçi"),
        escapeCsv(branch.name),
        escapeCsv(row.check_in ? new Date(row.check_in).toLocaleString("az-AZ", { timeZone: "Asia/Baku" }) : ""),
        escapeCsv(row.check_out ? new Date(row.check_out).toLocaleString("az-AZ", { timeZone: "Asia/Baku" }) : ""),
        escapeCsv(minutes),
        escapeCsv(row.source === "qr" ? "QR kod" : row.source === "correction" ? "Düzəliş" : row.source),
        escapeCsv(row.location_verified ? "Təsdiqlənib" : "Təsdiqlənməyib"),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const filename = `davamiyyet-${encodeURIComponent(branch.name.replace(/\s+/g, "_"))}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
