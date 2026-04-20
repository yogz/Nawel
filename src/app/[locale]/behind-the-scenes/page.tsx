import { getPublicCostsAction } from "@/app/actions/about-actions";
import { BehindTheScenes } from "@/features/about/components/BehindTheScenes";
import {
  BehindTheScenesJsonLd,
  getBehindTheScenesHreflang,
} from "@/components/seo/behind-the-scenes-json-ld";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toOpenGraphLocale, getAlternateOpenGraphLocales } from "@/lib/locale-utils";
import type { Metadata } from "next";
import type { Cost } from "@/lib/types";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.colist.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BehindTheScenes" });

  const title = t("metaTitle");
  const description = t("metaDescription");
  const pageUrl = `${BASE_URL}/${locale}/behind-the-scenes`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        ...getBehindTheScenesHreflang(),
        "x-default": `${BASE_URL}/fr/behind-the-scenes`,
      },
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "profile",
      locale: toOpenGraphLocale(locale),
      alternateLocale: getAlternateOpenGraphLocales(locale),
      siteName: "CoList",
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 800,
          height: 800,
          alt: title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/og-image.png`],
    },
  };
}

export default async function BehindTheScenesPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const costs = await getPublicCostsAction();

  return (
    <div className="min-h-screen bg-surface">
      <BehindTheScenesJsonLd locale={locale} />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">Chargement...</div>
        }
      >
        <BehindTheScenes costs={(costs ?? []) as Cost[]} />
      </Suspense>
    </div>
  );
}
