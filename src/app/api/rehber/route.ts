import { fail, ok, readMutation } from "@/shared/server/http";
import {
  fetchManagerHubData,
  addEmployee,
  addBranch,
  addShift,
} from "@/modules/organization/server/manager-hub";

export async function GET() {
  try {
    return ok(await fetchManagerHubData());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await readMutation(request)) as { action?: string };
    if (!body || typeof body !== "object" || !body.action) {
      throw new Error("INVALID_INPUT");
    }

    if (body.action === "add_employee") {
      return ok(await addEmployee(body));
    }
    if (body.action === "add_branch") {
      return ok(await addBranch(body));
    }
    if (body.action === "add_shift") {
      return ok(await addShift(body));
    }

    throw new Error("INVALID_INPUT");
  } catch (error) {
    return fail(error);
  }
}
