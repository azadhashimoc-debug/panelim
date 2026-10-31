import { z } from "zod";
import { userClient } from "@/infrastructure/supabase/server";
import { fail, ok, rateLimit, readMutation } from "@/shared/server/http";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    email: z.email().max(254),
    password: z.string().min(1).max(256),
  }),
  z.object({ action: z.literal("logout") }),
]);
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await readMutation(request));
    if (!parsed.success) throw new Error("INVALID_INPUT");
    const client = await userClient();
    if (parsed.data.action === "logout") {
      const { error } = await client.auth.signOut();
      if (error) throw new Error("INTERNAL");
      return ok({ success: true });
    }
    await rateLimit(`login:${parsed.data.email.trim().toLowerCase()}`, 8, 900);
    const { error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) throw new Error("AUTH_FAILED");
    return ok({ success: true });
  } catch (error) {
    return fail(error);
  }
}
