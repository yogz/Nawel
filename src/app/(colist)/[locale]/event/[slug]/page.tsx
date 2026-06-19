import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

// NOTE: Viewport configuration (themeColor, viewportFit, etc.) is handled by
// the layout.tsx file in this directory. See layout.tsx for details.
import { after } from "next/server";
import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { EventPlanner } from "@/components/planning/event-planner";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toOpenGraphLocale, getAlternateOpenGraphLocales } from "@/lib/locale-utils";
import { selectDueMealIds } from "@/features/meals/lib/assessment-guards";
import { processDueMealAssessments } from "@/features/meals/lib/assessment-processor";
import { isAssessmentHashCurrent } from "@/lib/meal-assessment-hash";

// ISR: revalidate every 30 seconds, on-demand via revalidatePath() from server actions
export const revalidate = 30;
// Headroom for the background "what's missing" AI computation scheduled via
// after(). Stays under the Vercel Hobby 60s function cap.
export const maxDuration = 45;

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

  // Build dynamic OG image URL with event details
  const firstMeal = plan.meals[0];
  const ogParams = new URLSearchParams({
    title,
    locale: params.locale,
    ...(firstMeal?.date && { date: firstMeal.date }),
  });
  const ogImageUrl = `https://www.colist.fr/api/og?${ogParams.toString()}`;

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
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
        },
      ],
    },
    other: {
      "og:logo": "https://www.colist.fr/LogoIcon.png",
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

  setRequestLocale(params.locale);

  const plan = await fetchPlan(params.slug);
  if (!plan.event) {
    notFound();
  }

  // Trigger the debounced "what's missing" assessment off the request path:
  // recompute meals that have settled and are missing/stale. The optimistic
  // claim inside the processor dedupes concurrent views.
  const dueMealIds = selectDueMealIds(
    plan.meals.map((meal) => ({
      id: meal.id,
      itemsChangedAt: meal.itemsChangedAt,
      assessmentComputedAt: meal.assessmentComputedAt,
      assessment: meal.assessment,
      assessmentOutdated:
        meal.assessment !== null && !isAssessmentHashCurrent(meal.assessmentInputHash),
      hasItems: meal.services.some((s) => s.items.length > 0),
    })),
    new Date()
  );
  if (dueMealIds.length > 0) {
    after(() => processDueMealAssessments(dueMealIds));
  }

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
