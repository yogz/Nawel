import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import type { Metadata } from "next";
import { ShoppingAllPage } from "@/components/planning/shopping-all-page";
import { getTranslations } from "next-intl/server";
import { toOpenGraphLocale, getAlternateOpenGraphLocales } from "@/lib/locale-utils";

export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "EventDashboard.Shopping" });
  const plan = await fetchPlan(params.slug);

  const title = t("allListTitle");
  const description = t("allListDescription");
  const url = `https://www.colist.fr/${params.locale}/event/${params.slug}/shopping/all`;

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
        fr: `https://www.colist.fr/fr/event/${params.slug}/shopping/all`,
        en: `https://www.colist.fr/en/event/${params.slug}/shopping/all`,
        es: `https://www.colist.fr/es/event/${params.slug}/shopping/all`,
        pt: `https://www.colist.fr/pt/event/${params.slug}/shopping/all`,
        de: `https://www.colist.fr/de/event/${params.slug}/shopping/all`,
        el: `https://www.colist.fr/el/event/${params.slug}/shopping/all`,
        it: `https://www.colist.fr/it/event/${params.slug}/shopping/all`,
        nl: `https://www.colist.fr/nl/event/${params.slug}/shopping/all`,
        pl: `https://www.colist.fr/pl/event/${params.slug}/shopping/all`,
        sv: `https://www.colist.fr/sv/event/${params.slug}/shopping/all`,
        da: `https://www.colist.fr/da/event/${params.slug}/shopping/all`,
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

  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const writeEnabled = isWriteKeyValid(key, plan.event?.adminKey ?? null);

  return (
    <ShoppingAllPage
      initialPlan={plan}
      slug={params.slug}
      writeKey={key}
      writeEnabled={writeEnabled}
    />
  );
}
