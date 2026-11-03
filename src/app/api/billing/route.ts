import {
  createPaycellCheckout,
  fetchSubscriptionStatus,
  processSandboxCheckout,
} from "@/modules/organization/server/billing";
import { fail, ok, readMutation } from "@/shared/server/http";
export async function GET() {
  try {
    return ok({ ok: true, status: await fetchSubscriptionStatus() });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await readMutation(request);
    if (
      body &&
      typeof body === "object" &&
      "mode" in body &&
      (body as { mode?: unknown }).mode === "paycell"
    ) {
      return ok(
        await createPaycellCheckout(
          body,
          request.headers.get("origin") ?? undefined,
        ),
      );
    }
    return ok(await processSandboxCheckout(body));
  } catch (error) {
    return fail(error);
  }
}
