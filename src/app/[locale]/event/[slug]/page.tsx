import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { Organizer } from "@/components/planning/organizer";
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
    title: `Nawel - ${plan.event?.name || params.slug}`,
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
      <Organizer initialPlan={plan} slug={params.slug} writeKey={key} writeEnabled={writeEnabled} />
    </Suspense>
  );
}
