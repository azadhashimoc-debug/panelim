import type { Metadata } from "next";
import { WelcomePage } from "@/modules/marketing/ui/welcome-page";
import { StructuredData } from "@/modules/marketing/ui/structured-data";

export const metadata: Metadata = {
  title: "panelim.az — Gəliş-gediş bir baxışda | QR Davamiyyət və Maaş Uçotu",
  description:
    "Azərbaycan biznesləri üçün QR və GPS davamiyyət, növbə cədvəli və daxili maaş uçotu platforması. Daimi Free lisenziya ilə indi başlayın.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "panelim.az — Gəliş-gediş bir baxışda",
    description:
      "QR davamiyyət, növbə qrafikləri və daxili maaş hesablaşması bir yerdə. Daimi Free lisenziya mövcuddur.",
    url: "/",
    siteName: "panelim.az",
    locale: "az_AZ",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 600,
        height: 400,
        alt: "panelim.az — Davamiyyət və maaş uçotu platforması",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "panelim.az — Gəliş-gediş bir baxışda",
    description:
      "QR davamiyyət, növbə qrafikləri və daxili maaş hesablaşması bir yerdə. Daimi Free lisenziya ilə dərhal başlayın.",
    images: ["/logo.png"],
  },
};

export default function Page() {
  return (
    <>
      <StructuredData />
      <WelcomePage year={new Date().getUTCFullYear()} />
    </>
  );
}
