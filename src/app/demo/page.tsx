import type { Metadata } from "next";
import { ManagerHub } from "@/modules/organization/ui/manager-hub";

export const metadata: Metadata = {
  title: "İnteraktiv Rəhbər Demo Ekranı — panelim.az",
  description:
    "Qeydiyyatsız baxın. Filial rəhbərinin kabineti: işçi heyəti, QR davamiyyət jurnalı, növbələr və daxili maaş uçotu.",
  alternates: {
    canonical: "/demo",
  },
};

export default function Page() {
  return <ManagerHub demo />;
}
