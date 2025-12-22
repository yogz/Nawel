import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { Organizer } from "@/components/planning/organizer";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await fetchPlan(params.slug);
  return {
    title: `Nawel - ${plan.event?.name || params.slug}`,
    description: plan.event?.description || "Organisez votre événement",
  };
}


export default async function Page({ params, searchParams }: Props) {
  const plan = await fetchPlan(params.slug);
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const writeEnabled = isWriteKeyValid(key, plan.event?.adminKey ?? null);

  return <Organizer initialPlan={plan} slug={params.slug} writeKey={key} writeEnabled={writeEnabled} />;
}
