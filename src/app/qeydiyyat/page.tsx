import { isConfigured } from "@/infrastructure/supabase/config";
import { RegisterForm } from "@/modules/identity/ui/register-form";

export const metadata = {
  title: "Qeydiyyat — panelim.az",
  description: "Şirkətinizi qeydiyyatdan keçirin və 14 günlük ödənişsiz sınaqla başlayın.",
};

export default function Page() {
  return <RegisterForm configured={isConfigured()} />;
}
