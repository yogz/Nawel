import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { Organizer } from "@/components/planning/organizer";
import type { Metadata } from "next";

// ISR: revalidate every 30 seconds, on-demand via revalidatePath() from server actions
export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const plan = await fetchPlan(params.slug);
  return {
    title: `Nawel - ${plan.event?.name || params.slug}`,
    description: plan.event?.description || "Organisez votre événement",
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const plan = await fetchPlan(params.slug);
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const writeEnabled = isWriteKeyValid(key, plan.event?.adminKey ?? null);

  return (
    <Organizer initialPlan={plan} slug={params.slug} writeKey={key} writeEnabled={writeEnabled} />
  );
}
