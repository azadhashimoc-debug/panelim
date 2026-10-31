import { isConfigured } from "@/infrastructure/supabase/config";
import { LoginForm } from "@/modules/identity/ui/login-form";
export default function Page() {
  return <LoginForm configured={isConfigured()} />;
}
