import QRCode from "qrcode";
import { z } from "zod";
import { requireBranchAccess } from "@/modules/organization/server/access";
import { signQr } from "@/modules/attendance/domain/qr";
import { requireConfig } from "@/infrastructure/supabase/config";
import { fail, ok, rateLimit, readMutation } from "@/shared/server/http";
export async function POST(request: Request) {
  try {
    const input = z
      .object({ branchId: z.uuid() })
      .strict()
      .safeParse(await readMutation(request));
    if (!input.success) throw new Error("INVALID_INPUT");
    const { user } = await requireBranchAccess(input.data.branchId, "manage");
    await rateLimit(`qr:${user.id}`, 30);
    const token = signQr(input.data.branchId, requireConfig().qrSecret);
    const link = new URL("/isci", process.env.APP_URL || request.url);
    link.searchParams.set("qr", token);
    return ok({
      image: await QRCode.toDataURL(link.href, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
      }),
      expiresAt: Date.now() + 120000,
    });
  } catch (error) {
    return fail(error);
  }
}
