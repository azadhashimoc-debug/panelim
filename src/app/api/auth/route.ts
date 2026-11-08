import { z } from "zod";
import { createHmac, randomInt } from "node:crypto";
import { serviceClient, userClient } from "@/infrastructure/supabase/server";
import { fail, ok, rateLimit, readMutation } from "@/shared/server/http";
import { sendEmail } from "@/infrastructure/email/resend";

function getSecret() {
  return process.env.QR_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "panelim-otp-default-secret";
}

export function signOtpTicket(purpose: string, email: string, code: string, expiresAt: number) {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(`${purpose}:${email.toLowerCase().trim()}:${code}:${expiresAt}`);
  return `${expiresAt}.${hmac.digest("hex")}`;
}

export function verifyOtpTicket(purpose: string, email: string, code: string, ticket: string) {
  const parts = ticket.split(".");
  if (parts.length !== 2) return false;
  const [expStr, signature] = parts;
  const expiresAt = Number(expStr);
  if (!expiresAt || Date.now() > expiresAt) return false;
  const expected = signOtpTicket(purpose, email, code, expiresAt).split(".")[1];
  return signature === expected;
}

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("login"),
    email: z.string().email().max(254),
    password: z.string().min(1).max(256),
  }),
  z.object({
    action: z.literal("register_request_otp"),
    email: z.string().email().max(254),
  }),
  z.object({
    action: z.literal("register_verify_otp"),
    email: z.string().email().max(254),
    code: z.string().trim().length(6),
    ticket: z.string().min(20).max(512),
    displayName: z.string().trim().min(2).max(100),
    companyName: z.string().trim().min(2).max(120),
    branchName: z.string().trim().max(120).optional(),
    password: z.string().min(6).max(256),
  }),
  z.object({
    action: z.literal("reset_password_request"),
    email: z.string().email().max(254),
  }),
  z.object({
    action: z.literal("reset_password_verify"),
    email: z.string().email().max(254),
    code: z.string().trim().length(6),
    ticket: z.string().min(20).max(512),
    password: z.string().min(6).max(256),
  }),
  z.object({
    action: z.literal("register"),
    email: z.string().email().max(254),
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

    if (parsed.data.action === "register_request_otp") {
      const email = parsed.data.email.trim().toLowerCase();
      await rateLimit(`reg_otp:${email}`, 5, 300);

      const code = randomInt(100000, 1000000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const ticket = signOtpTicket("register", email, code, expiresAt);

      const emailResult = await sendEmail({
        to: email,
        subject: "Panelim — Qeydiyyat təsdiq kodu",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
            <div style="margin-bottom: 24px; text-align: center;">
              <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700;">Panelim</h2>
              <p style="margin: 6px 0 0; color: #6b7280; font-size: 14px;">İşin vaxtında. Hər şey qaydasında.</p>
            </div>
            <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #f1f5f9;">
              <p style="margin: 0 0 12px; color: #334155; font-size: 15px;">Şirkət qeydiyyatınızı təsdiqləmək üçün birdəfəlik kodunuz:</p>
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a; padding: 12px 24px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; display: inline-block;">
                ${code}
              </div>
              <p style="margin: 12px 0 0; color: #64748b; font-size: 13px;">Kod 10 dəqiqə ərzində etibarlıdır.</p>
            </div>
            <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
              Bu sorğunu siz göndərməmisinizsə, məktubu nəzərə almayın.
            </p>
          </div>
        `,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || "INTERNAL");
      }

      return ok({ success: true, ticket });
    }

    if (parsed.data.action === "register_verify_otp") {
      const email = parsed.data.email.trim().toLowerCase();
      await rateLimit(`reg_verify:${email}`, 8, 300);

      if (!verifyOtpTicket("register", email, parsed.data.code.trim(), parsed.data.ticket)) {
        throw new Error("INVALID_INPUT");
      }

      let targetUserId: string | null = null;
      const { data: created, error: createError } = await serviceClient().auth.admin.createUser({
        email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: { display_name: parsed.data.displayName },
      });

      if (createError) {
        const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
          email,
          password: parsed.data.password,
        });

        if (signInError || !signInData.user) {
          const { data: userList } = await serviceClient().auth.admin.listUsers();
          const existing = userList?.users?.find((u) => u.email?.toLowerCase() === email);
          if (!existing) throw new Error("INTERNAL");
          await serviceClient().auth.admin.updateUserById(existing.id, {
            password: parsed.data.password,
            email_confirm: true,
            user_metadata: { display_name: parsed.data.displayName },
          });
          targetUserId = existing.id;
        } else {
          targetUserId = signInData.user.id;
        }
      } else {
        targetUserId = created.user?.id ?? null;
      }

      if (!targetUserId) throw new Error("INTERNAL");

      const { data: existingMember } = await serviceClient()
        .from("memberships")
        .select("id")
        .eq("user_id", targetUserId)
        .is("archived_at", null)
        .maybeSingle();

      if (existingMember) throw new Error("ALREADY_EXISTS");

      const { data: registration, error: rpcError } = await serviceClient().rpc(
        "register_company",
        {
          p_user_id: targetUserId,
          p_display_name: parsed.data.displayName,
          p_company_name: parsed.data.companyName,
          p_branch_name: parsed.data.branchName || "Baş Filial",
        },
      );

      if (rpcError || !registration || registration.success !== true) {
        if (rpcError?.message?.includes("ALREADY_EXISTS")) throw new Error("ALREADY_EXISTS");
        throw new Error("INTERNAL");
      }

      try {
        await client.auth.signInWithPassword({
          email,
          password: parsed.data.password,
        });
      } catch {
        // Continue
      }

      return ok({ success: true, redirect: "/rehber" });
    }

    if (parsed.data.action === "reset_password_request") {
      const email = parsed.data.email.trim().toLowerCase();
      await rateLimit(`reset_req:${email}`, 5, 300);

      const { data: users } = await serviceClient().auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email?.toLowerCase() === email);

      if (user) {
        const { data: member } = await serviceClient()
          .from("memberships")
          .select("id, role")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .is("archived_at", null)
          .maybeSingle();

        if (member) {
          const code = randomInt(100000, 1000000).toString();
          const expiresAt = Date.now() + 10 * 60 * 1000;
          const ticket = signOtpTicket("reset", email, code, expiresAt);

          await sendEmail({
            to: email,
            subject: "Panelim — Şifrə sıfırlama kodu",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
                <div style="margin-bottom: 24px; text-align: center;">
                  <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700;">Panelim</h2>
                  <p style="margin: 6px 0 0; color: #6b7280; font-size: 14px;">Şifrə Sıfırlama</p>
                </div>
                <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #f1f5f9;">
                  <p style="margin: 0 0 12px; color: #334155; font-size: 15px;">Şifrənizi sıfırlamaq üçün birdəfəlik təsdiq kodunuz:</p>
                  <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a; padding: 12px 24px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; display: inline-block;">
                    ${code}
                  </div>
                  <p style="margin: 12px 0 0; color: #64748b; font-size: 13px;">Kod 10 dəqiqə ərzində etibarlıdır.</p>
                </div>
                <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                  Bu sorğunu siz göndərməmisinizsə, hesabınız təhlükəsizdədir.
                </p>
              </div>
            `,
          });

          return ok({ success: true, ticket });
        }
      }

      const dummyTicket = signOtpTicket("reset", email, "000000", Date.now() + 60000);
      return ok({ success: true, ticket: dummyTicket });
    }

    if (parsed.data.action === "reset_password_verify") {
      const email = parsed.data.email.trim().toLowerCase();
      await rateLimit(`reset_verify:${email}`, 8, 300);

      if (!verifyOtpTicket("reset", email, parsed.data.code.trim(), parsed.data.ticket)) {
        throw new Error("INVALID_INPUT");
      }

      const { data: users } = await serviceClient().auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!user) throw new Error("INTERNAL");

      const { error: updateErr } = await serviceClient().auth.admin.updateUserById(user.id, {
        password: parsed.data.password,
      });
      if (updateErr) throw new Error("INTERNAL");

      try {
        await client.auth.signInWithPassword({
          email,
          password: parsed.data.password,
        });
      } catch {
        // Continue
      }

      return ok({ success: true, redirect: "/rehber" });
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
