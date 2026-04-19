import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://www.colist.fr";

const OTHER_PROJECTS = [
  {
    id: "milou",
    url: "https://www.milou.studio/",
  },
  {
    id: "tenisfranz",
    url: "https://tenis-franz.vercel.app/",
  },
  {
    id: "maurice",
    url: "https://www.ecrireavecmaurice.fr/",
  },
] as const;

export async function BehindTheScenesJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "BehindTheScenes" });
  const pageUrl = `${BASE_URL}/${locale}/behind-the-scenes`;

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${BASE_URL}/#nicolas`,
    name: "Nicolas",
    url: BASE_URL,
    image: `${BASE_URL}/me.jpg`,
    jobTitle: t("personJobTitle"),
    description: t("personDescription"),
    nationality: { "@type": "Country", name: "France" },
    sameAs: OTHER_PROJECTS.map((p) => p.url),
    knowsAbout: [
      "Web Development",
      "TypeScript",
      "React",
      "Next.js",
      "PostgreSQL",
      "Product Design",
    ],
  };

  const profilePage = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${pageUrl}#profile`,
    url: pageUrl,
    name: t("title"),
    description: t("personDescription"),
    inLanguage: locale,
    mainEntity: { "@id": `${BASE_URL}/#nicolas` },
    about: { "@id": `${BASE_URL}/#nicolas` },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      name: "CoList",
      url: BASE_URL,
    },
  };

  const projectWorks = OTHER_PROJECTS.map((project) => ({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${project.url}#creativework`,
    name: t(`otherProjects.${project.id}.title`),
    description: t(`otherProjects.${project.id}.description`),
    url: project.url,
    creator: { "@id": `${BASE_URL}/#nicolas` },
    author: { "@id": `${BASE_URL}/#nicolas` },
  }));

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    inLanguage: locale,
    mainEntity: [
      {
        "@type": "Question",
        name: t("faq.whoCreatedColist.question"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faq.whoCreatedColist.answer"),
        },
      },
      {
        "@type": "Question",
        name: t("faq.otherProjects.question"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faq.otherProjects.answer"),
        },
      },
      {
        "@type": "Question",
        name: t("faq.whyColist.question"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faq.whyColist.answer"),
        },
      },
      {
        "@type": "Question",
        name: t("faq.isItFree.question"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("faq.isItFree.answer"),
        },
      },
    ],
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumbs`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "CoList",
        item: `${BASE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("title"),
        item: pageUrl,
      },
    ],
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [person, profilePage, ...projectWorks, faqPage, breadcrumbs],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export function getBehindTheScenesHreflang() {
  return Object.fromEntries(routing.locales.map((l) => [l, `${BASE_URL}/${l}/behind-the-scenes`]));
}
