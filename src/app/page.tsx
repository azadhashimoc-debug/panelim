import { WelcomePage } from "@/modules/marketing/ui/welcome-page";
export default function Page() {
  return <WelcomePage year={new Date().getUTCFullYear()} />;
}
