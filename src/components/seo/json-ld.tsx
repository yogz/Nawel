import { Locale } from "@/i18n/routing";

export function JsonLd({ locale }: { locale: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CoList",
    alternateName: "Nawel",
    description:
      locale === "fr"
        ? "Coordonnez vos repas de fêtes simplement. Partagez le lien avec votre famille pour que chacun puisse choisir ce qu'il apporte !"
        : "Coordinate your holiday meals simply. Share the link with your family so everyone can choose what they bring!",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    logo: "https://www.colist.fr/LogoIcon.png",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "120",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
