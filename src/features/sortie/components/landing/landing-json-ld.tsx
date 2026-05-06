/**
 * Markup Schema.org pour la landing publique. Deux blocs distincts :
 *
 * - `SoftwareApplication` — décrit Sortie pour les rich results Google
 *   et permet aux AI engines (ChatGPT, Perplexity, Claude) de citer le
 *   produit avec ses caractéristiques (gratuit, web, FR).
 * - `FAQPage` — questions/réponses indexables. Pas d'UI accordéon
 *   visible (anti-pattern Acid Cabinet). Le markup seul suffit pour
 *   Google rich snippets et la consultation par les LLM crawlers.
 *
 * Pas de PII, pas de URL dynamique : tout est statique au build.
 */

const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Sortie, c'est quoi ?",
    a: "Sortie est un site pour organiser des sorties culturelles entre amis. Tu lances un événement, tu partages le lien, tes amis répondent en 1 tap sans créer de compte. Suivi des billets et des dettes inclus.",
  },
  {
    q: "Faut-il créer un compte pour répondre à une invitation ?",
    a: "Non. Quand tu reçois un lien Sortie, tu peux répondre oui, non ou peut-être en un seul tap, sans créer de compte ni installer d'application.",
  },
  {
    q: "Comment se passe le partage des billets et de l'argent ?",
    a: "Quand quelqu'un achète les billets pour le groupe, il déclare l'achat sur la sortie. Sortie calcule automatiquement qui doit combien à qui, et permet de partager un IBAN ou un lien de paiement.",
  },
  {
    q: "Sortie est-il gratuit ?",
    a: "Oui. Sortie est entièrement gratuit pour organiser, inviter et participer à des sorties.",
  },
  {
    q: "Pour quels types de sorties ?",
    a: "Sortie est conçu pour les sorties culturelles entre amis : théâtre, opéra, concert, cinéma, expositions, festivals. Pratique aussi pour toute sortie où aligner un groupe et partager des billets prend du temps.",
  },
];

const SOFTWARE_APP_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Sortie",
  url: "https://sortie.colist.fr/",
  description:
    "Organise des sorties culturelles entre amis : théâtre, opéra, concert, ciné, expo. RSVP en 1 tap sans compte, suivi des billets et des dettes intégré.",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  inLanguage: "fr-FR",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: {
      "@type": "Answer",
      text: a,
    },
  })),
};

export function LandingJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APP_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
      />
    </>
  );
}
