import { marketing as m } from "../content";

export function StructuredData({ baseUrl = "https://panelim.az" }: { baseUrl?: string }) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "panelim.az",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: "Azərbaycan biznesləri üçün QR davamiyyət, növbə qrafikləri və daxili maaş uçotu platforması.",
    sameAs: [],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "panelim.az",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Mobile Browser, iOS, Android",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "AZN",
        description: "3 işçiyə qədər, 1 filial, daimi pulsuz QR və GPS davamiyyət.",
      },
      {
        "@type": "Offer",
        name: "Start",
        price: "15",
        priceCurrency: "AZN",
        description: "10 işçiyə qədər, 1 filial, növbə cədvəli və Excel çıxarışı.",
      },
      {
        "@type": "Offer",
        name: "Business",
        price: "29",
        priceCurrency: "AZN",
        description: "25 işçiyə qədər, 2 filial, daxili maaş və avans uçotu.",
      },
      {
        "@type": "Offer",
        name: "Growth",
        price: "49",
        priceCurrency: "AZN",
        description: "50 işçiyə qədər, 3 filial, müqayisəli filial analitikası.",
      },
    ],
    featureList: [
      "QR kod və GPS məkan yoxlaması ilə davamiyyət",
      "Növbə və iş qrafikləri",
      "İcazə və məzuniyyət müraciətləri",
      "Daxili əməkhaqqı, avans və əlavə saat uçotu",
      "Filiallar üzrə hesabatlar və audit",
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: m.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "panelim.az",
    url: baseUrl,
    inLanguage: "az",
    description: m.intro,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
