import type { Metadata } from "next";
import { EmployeePage } from "@/modules/attendance/ui/employee-page";

export const metadata: Metadata = {
  title: "İnteraktiv İşçi Kabineti Demosu — panelim.az",
  description:
    "Qeydiyyatsız baxın. Real qeyd yaradılmadan işçi kabineti, QR davamiyyət və növbə cədvəli ilə tanış olun.",
  alternates: {
    canonical: "/demo/isci",
  },
};

export default function Page() {
  return <EmployeePage view="today" demo />;
}
