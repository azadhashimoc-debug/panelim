import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://panelim.az";

export const viewport: Viewport = {
  themeColor: "#087d73",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "panelim.az — İşçi Davamiyyəti və Daxili Maaş Uçotu Platforması",
    template: "%s — panelim.az",
  },
  description:
    "Kafe, restoran və mağazalar üçün turniketsiz mobil davamiyyət: dinamik QR və GPS yoxlanışı, növbə cədvəlləri, icazə və daxili maaş uçotu bir platformada. Bakı və Azərbaycan biznesləri üçün.",
  keywords: [
    "işçi davamiyyəti sistemi",
    "QR davamiyyət sistemi",
    "maaş uçotu proqramı",
    "avans hesablama",
    "növbə qrafiki cədvəli",
    "kafe restoran işçi proqramı",
    "işçi nəzarəti proqramı",
    "Bakı işçi qeydiyyatı",
    "turniketsiz davamiyyət",
    "panelim.az",
  ],
  authors: [{ name: "panelim.az" }],
  creator: "panelim.az",
  publisher: "panelim.az",
  applicationName: "panelim.az",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "az_AZ",
    url: baseUrl,
    siteName: "panelim.az",
    title: "panelim.az — Gəliş-gediş bir baxışda",
    description:
      "QR davamiyyət, növbə qrafikləri və daxili maaş hesablaşması. 3 işçiyə qədər daimi Free lisenziya ilə başlayın.",
    images: [
      {
        url: "/logo.png",
        width: 600,
        height: 400,
        alt: "panelim.az logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "panelim.az — Gəliş-gediş bir baxışda",
    description:
      "QR davamiyyət, növbə qrafikləri və daxili maaş hesablaşması. Daimi Free lisenziya mövcuddur.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="az">
      <body>
        <a className="skip-link" href="#main">
          Məzmuna keç
        </a>
        {children}
      </body>
    </html>
  );
}
