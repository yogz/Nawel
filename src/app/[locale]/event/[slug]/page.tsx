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
  return {
    title: plan.event?.name || params.slug,
    description:
      plan.event?.description || t("shareNavigatorText", { name: plan.event?.name || params.slug }),
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
