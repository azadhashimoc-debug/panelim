import type { Metadata } from "next";
import { isConfigured } from "@/infrastructure/supabase/config";
import { LoginForm } from "@/modules/identity/ui/login-form";

export const metadata: Metadata = {
  title: "Daxil ol",
  description: "İşçi və ya şirkət rəhbəri hesabınıza daxil olun. QR davamiyyət və iş qrafikinizi izləyin.",
  alternates: {
    canonical: "/giris",
  },
};

export default function Page() {
  return <LoginForm configured={isConfigured()} />;
}
