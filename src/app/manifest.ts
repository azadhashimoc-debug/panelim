import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "panelim.az — Gəliş-gediş bir baxışda",
    short_name: "panelim.az",
    description: "QR davamiyyət, növbə qrafikləri və daxili maaş uçotu platforması",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#087d73",
    lang: "az",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
