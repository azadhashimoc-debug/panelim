import { recordAttendance } from "@/modules/attendance/server/commands";
import { fail, ok, readMutation } from "@/shared/server/http";
export async function POST(request: Request) {
  try {
    return ok(await recordAttendance(await readMutation(request)));
  } catch (error) {
    return fail(error);
  }
}
