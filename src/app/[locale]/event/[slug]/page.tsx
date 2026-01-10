import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};
import { Suspense } from "react";
import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { EventPlanner } from "@/components/planning/event-planner";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toOpenGraphLocale, getAlternateOpenGraphLocales } from "@/lib/locale-utils";

// ISR: revalidate every 30 seconds, on-demand via revalidatePath() from server actions
export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "EventDashboard.Header" });
  const plan = await fetchPlan(params.slug);

  const title = plan.event?.name || params.slug;
  const description =
    plan.event?.description || t("shareNavigatorText", { name: plan.event?.name || params.slug });
  const url = `https://www.colist.fr/${params.locale}/event/${params.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        fr: `https://www.colist.fr/fr/event/${params.slug}`,
        en: `https://www.colist.fr/en/event/${params.slug}`,
        es: `https://www.colist.fr/es/event/${params.slug}`,
        pt: `https://www.colist.fr/pt/event/${params.slug}`,
        de: `https://www.colist.fr/de/event/${params.slug}`,
        el: `https://www.colist.fr/el/event/${params.slug}`,
        it: `https://www.colist.fr/it/event/${params.slug}`,
        nl: `https://www.colist.fr/nl/event/${params.slug}`,
        pl: `https://www.colist.fr/pl/event/${params.slug}`,
        sv: `https://www.colist.fr/sv/event/${params.slug}`,
        da: `https://www.colist.fr/da/event/${params.slug}`,
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
          url: "https://www.colist.fr/og-image.jpg",
          width: 1024,
          height: 1024,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://www.colist.fr/og-image.jpg"],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  setRequestLocale(params.locale);

  const plan = await fetchPlan(params.slug);
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const writeEnabled = isWriteKeyValid(key, plan.event?.adminKey ?? null);

  return (
    <Suspense fallback={<div className="min-h-screen w-full animate-pulse bg-gray-50/50" />}>
      <EventPlanner
        initialPlan={plan}
        slug={params.slug}
        writeKey={key}
        writeEnabled={writeEnabled}
      />
    </Suspense>
  );
}
