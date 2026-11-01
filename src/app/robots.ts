import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://panelim.az";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo", "/demo/*", "/qeydiyyat", "/giris"],
        disallow: ["/api/", "/isci/", "/rehber/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
