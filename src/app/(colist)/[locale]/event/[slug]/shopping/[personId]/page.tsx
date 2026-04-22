import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ShoppingPage } from "@/components/planning/shopping-page";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { toOpenGraphLocale, getAlternateOpenGraphLocales } from "@/lib/locale-utils";

export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string; personId: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "EventDashboard.Shopping" });
  const plan = await fetchPlan(params.slug);
  const person = plan.people.find((p) => p.id === parseInt(params.personId));

  const title = person ? t("individualListTitle", { name: person.name }) : t("allListTitle");
  const description = person
    ? t("individualListDescription", {
        name: person.name,
        event: plan.event?.name || params.slug,
      })
    : t("allListDescription");

  const url = `https://www.colist.fr/${params.locale}/event/${params.slug}/shopping/${params.personId}`;

  // Build dynamic OG image URL
  const ogParams = new URLSearchParams({
    title,
    locale: params.locale,
  });
  const ogImageUrl = `https://www.colist.fr/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        fr: `https://www.colist.fr/fr/event/${params.slug}/shopping/${params.personId}`,
        en: `https://www.colist.fr/en/event/${params.slug}/shopping/${params.personId}`,
        es: `https://www.colist.fr/es/event/${params.slug}/shopping/${params.personId}`,
        pt: `https://www.colist.fr/pt/event/${params.slug}/shopping/${params.personId}`,
        de: `https://www.colist.fr/de/event/${params.slug}/shopping/${params.personId}`,
        el: `https://www.colist.fr/el/event/${params.slug}/shopping/${params.personId}`,
        it: `https://www.colist.fr/it/event/${params.slug}/shopping/${params.personId}`,
        nl: `https://www.colist.fr/nl/event/${params.slug}/shopping/${params.personId}`,
        pl: `https://www.colist.fr/pl/event/${params.slug}/shopping/${params.personId}`,
        sv: `https://www.colist.fr/sv/event/${params.slug}/shopping/${params.personId}`,
        da: `https://www.colist.fr/da/event/${params.slug}/shopping/${params.personId}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: toOpenGraphLocale(params.locale),
      alternateLocale: getAlternateOpenGraphLocales(params.locale),
      siteName: "CoList",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const plan = await fetchPlan(params.slug);

  const personId = parseInt(params.personId);
  const person = plan.people.find((p) => p.id === personId);

  if (!person) {
    notFound();
  }

  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const writeEnabled = isWriteKeyValid(key, plan.event?.adminKey ?? null);

  return (
    <ShoppingPage
      initialPlan={plan}
      person={person}
      slug={params.slug}
      writeKey={key}
      writeEnabled={writeEnabled}
    />
  );
}
