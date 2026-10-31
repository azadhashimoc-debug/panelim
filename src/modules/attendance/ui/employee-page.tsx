import { isConfigured } from "@/infrastructure/supabase/config";
import { EmployeeWorkspace } from "./employee-workspace";
export function EmployeePage({
  view,
  demo = false,
}: {
  view: "today" | "history" | "requests";
  demo?: boolean;
}) {
  return (
    <EmployeeWorkspace
      configured={!demo && isConfigured()}
      basePath={demo ? "/demo" : "/isci"}
      demo={demo}
      initialNow={new Date().toISOString()}
      view={view}
    />
  );
}
