import { isConfigured } from "@/infrastructure/supabase/config";
import { ManagerWorkspace } from "@/modules/attendance/ui/manager-workspace";
export default function Page() {
  return <ManagerWorkspace configured={isConfigured()} />;
}
