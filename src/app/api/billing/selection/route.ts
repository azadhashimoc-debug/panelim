import { completeFreeSelection, fetchFreeSelectionOptions } from "@/modules/organization/server/subscription-selection";
import { fail, ok, readMutation } from "@/shared/server/http";

export async function GET() {
  try { return ok(await fetchFreeSelectionOptions()); }
  catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try { return ok(await completeFreeSelection(await readMutation(request))); }
  catch (error) { return fail(error); }
}
