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
  z.object({
    action: z.literal("complete_setup"),
    displayName: z.string().trim().min(2).max(100),
    companyName: z.string().trim().min(2).max(120),
    branchName: z.string().trim().max(120).optional(),
  }),
  z.object({ action: z.literal("logout") }),
  z.object({
    action: z.literal("accept_invite"),
    token: z.string().min(20).max(512),
    password: z.string().min(8).max(256),
  }),
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

    if (parsed.data.action === "accept_invite") {
      await rateLimit(`accept_invite:${parsed.data.token}`, 10, 3600);
      // Token yalnız burada, şifrə göndəriləndə işlədilir: keçid önizləməsi onu xərcləyə bilmir
      const { data: verified, error: verifyError } = await client.auth.verifyOtp({
        type: "recovery",
        token_hash: parsed.data.token,
      });
      if (verifyError || !verified.user) throw new Error("INVITE_INVALID");

      const { error: passwordError } = await client.auth.updateUser({
        password: parsed.data.password,
      });
      if (passwordError) {
        await client.auth.signOut();
        throw new Error("INVITE_PASSWORD");
      }

      const { data: member } = await serviceClient()
        .from("memberships")
        .select("role, company_id")
        .eq("user_id", verified.user.id)
        .is("archived_at", null)
        .maybeSingle();
      return ok({
        success: true,
        redirect: !member
          ? "/qeydiyyat?qurulum=davam"
          : member.role === "owner"
            ? "/rehber"
            : "/isci",
      });
    }

    if (parsed.data.action === "login") {
      await rateLimit(
        `login:${parsed.data.email.trim().toLowerCase()}`,
        8,
        900,
      );
      const { data: signInData, error } = await client.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error || !signInData.user) throw new Error("AUTH_FAILED");

      const { data: member } = await serviceClient()
        .from("memberships")
        .select("role, company_id")
        .eq("user_id", signInData.user.id)
        .is("archived_at", null)
        .maybeSingle();

      if (!member) {
        return ok({
          success: true,
          needsSetup: true,
          redirect: "/qeydiyyat?qurulum=davam",
        });
      }

      return ok({
        success: true,
        needsSetup: false,
        role: member.role,
        redirect: member.role === "owner" ? "/rehber" : "/isci",
      });
    }

    if (parsed.data.action === "complete_setup") {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) throw new Error("UNAUTHENTICATED");
      const userId = authData.user.id;

      await rateLimit(`complete_setup:${userId}`, 5, 3600);

      const { data: existingMember } = await serviceClient()
        .from("memberships")
        .select("id")
        .eq("user_id", userId)
        .is("archived_at", null)
        .maybeSingle();

      if (existingMember) throw new Error("ALREADY_EXISTS");

      const { data: registration, error: rpcError } = await serviceClient().rpc(
        "register_company",
        {
          p_user_id: userId,
          p_display_name: parsed.data.displayName,
          p_company_name: parsed.data.companyName,
          p_branch_name: parsed.data.branchName || "Baş Filial",
        },
      );
      if (rpcError || !registration || registration.success !== true)
        throw new Error("INTERNAL");

      return ok({
        success: true,
        requiresEmailConfirmation: false,
      });
    }

    if (parsed.data.action === "register") {
      const email = parsed.data.email.trim().toLowerCase();
      await rateLimit(`register:${email}`, 5, 3600);

      const { data: signUpData, error: signUpError } = await client.auth.signUp(
        {
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: {
              display_name: parsed.data.displayName,
            },
          },
        },
      );

      let targetUserId = signUpData?.user?.id;
      let requiresEmailConfirmation = !signUpData?.session;
      let isRecovery = false;

      const isExistingUser =
        Boolean(
          signUpError &&
            (signUpError.message.includes("already registered") ||
              signUpError.message.includes("unique") ||
              signUpError.message.includes("exists")),
        ) ||
        Boolean(
          !signUpError &&
            (!signUpData?.user || signUpData.user.identities?.length === 0),
        );

      if (isExistingUser) {
        const { data: signInData, error: signInError } =
          await client.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });

        if (signInError || !signInData.user) {
          throw new Error("ALREADY_EXISTS");
        }

        const { data: existingMember } = await serviceClient()
          .from("memberships")
          .select("id")
          .eq("user_id", signInData.user.id)
          .is("archived_at", null)
          .maybeSingle();

        if (existingMember) {
          throw new Error("ALREADY_EXISTS");
        }

        targetUserId = signInData.user.id;
        requiresEmailConfirmation = false;
        isRecovery = true;
      } else if (signUpError) {
        throw new Error("INTERNAL");
      }

      if (!targetUserId) throw new Error("INTERNAL");

      // Auto-confirm user so they are immediately active without email confirmation friction
      try {
        await serviceClient().auth.admin.updateUserById(targetUserId, { email_confirm: true });
      } catch {
        // Fallback silently if already confirmed
      }

      const { data: registration, error: rpcError } = await serviceClient().rpc(
        "register_company",
        {
          p_user_id: targetUserId,
          p_display_name: parsed.data.displayName,
          p_company_name: parsed.data.companyName,
          p_branch_name: parsed.data.branchName || "Baş Filial",
        },
      );
      if (rpcError || !registration || registration.success !== true)
        throw new Error("INTERNAL");

      // Establish session cookies immediately
      try {
        await client.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
      } catch {
        // Continue if client sign-in needs manual entry
      }

      return ok({
        success: true,
        requiresEmailConfirmation: false,
        ...(isRecovery ? { recovered: true } : {}),
      });
    }

    throw new Error("INVALID_INPUT");
  } catch (error) {
    return fail(error);
  }
}
