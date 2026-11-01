import type { Metadata } from "next";
import { isConfigured } from "@/infrastructure/supabase/config";
import { serviceClient, userClient } from "@/infrastructure/supabase/server";
import { RegisterForm } from "@/modules/identity/ui/register-form";

export const metadata: Metadata = {
  title: "Qeydiyyat",
  description: "Şirkətinizi qeydiyyatdan keçirin və daimi Free lisenziyası ilə başlayın.",
  alternates: {
    canonical: "/qeydiyyat",
  },
};

export default async function Page() {
  const configured = isConfigured();
  let pendingUser: { id: string; email?: string; displayName?: string } | null = null;

  if (configured) {
    try {
      const client = await userClient();
      const { data } = await client.auth.getUser();
      if (data?.user) {
        const { data: member } = await serviceClient()
          .from("memberships")
          .select("id")
          .eq("user_id", data.user.id)
          .is("archived_at", null)
          .maybeSingle();

        if (!member) {
          pendingUser = {
            id: data.user.id,
            email: data.user.email,
            displayName: (data.user.user_metadata?.display_name as string) || "",
          };
        }
      }
    } catch {
      // Unauthenticated or network issue, fallback to normal registration form
    }
  }

  return <RegisterForm configured={configured} pendingUser={pendingUser} />;
}
