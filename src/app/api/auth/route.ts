import { z } from "zod";
import { serviceClient, userClient } from "@/infrastructure/supabase/server";
import { fail, ok, rateLimit, readMutation } from "@/shared/server/http";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    email: z.email().max(254),
    password: z.string().min(1).max(256),
  }),
  z.object({
    action: z.literal("register"),
    email: z.email().max(254),
    password: z.string().min(6).max(256),
    displayName: z.string().trim().min(2).max(100),
    companyName: z.string().trim().min(2).max(120),
    branchName: z.string().trim().max(120).optional(),
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

    if (parsed.data.action === "login") {
      await rateLimit(`login:${parsed.data.email.trim().toLowerCase()}`, 8, 900);
      const { error } = await client.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw new Error("AUTH_FAILED");
      return ok({ success: true });
    }

    if (parsed.data.action === "register") {
      const email = parsed.data.email.trim().toLowerCase();
      await rateLimit(`register:${email}`, 5, 3600);

      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            display_name: parsed.data.displayName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered") || signUpError.message.includes("unique")) {
          throw new Error("ALREADY_EXISTS");
        }
        throw new Error("INTERNAL");
      }

      if (signUpData.user) {
        try {
          const { error: rpcError } = await serviceClient().rpc("register_company", {
            p_user_id: signUpData.user.id,
            p_display_name: parsed.data.displayName,
            p_company_name: parsed.data.companyName,
            p_branch_name: parsed.data.branchName || "Baş Filial",
          });
          if (rpcError) {
            // Log but don't crash if already initialized
            console.error("register_company rpc error:", rpcError);
          }
        } catch (e) {
          console.error("register_company exception:", e);
        }
      }

      return ok({ success: true, user: signUpData.user });
    }

    throw new Error("INVALID_INPUT");
  } catch (error) {
    return fail(error);
  }
}
