import {
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
    return ok(await processSandboxCheckout(await readMutation(request)));
  } catch (error) {
    return fail(error);
  }
}
