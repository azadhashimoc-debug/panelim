import type { Metadata } from "next";
import { InviteForm } from "@/modules/identity/ui/invite-form";

export const metadata: Metadata = {
  title: "Şifrənizi təyin edin",
  description: "panelim.az hesabınız üçün şifrə təyin edin.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return <InviteForm />;
}
