import type { Metadata } from "next";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "panelim.az — Gəliş-gediş bir baxışda",
  description:
    "İşçilərin QR və məkan yoxlaması ilə giriş-çıxışını, filial qeydlərini və düzəliş müraciətlərini bir yerdə izləyin.",
  icons: { icon: "/logo.png" },
  robots: { index: false, follow: false },
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
