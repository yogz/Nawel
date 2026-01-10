import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import type { Metadata } from "next";
import { ShoppingAllPage } from "@/components/planning/shopping-all-page";

export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const plan = await fetchPlan(params.slug);

  return {
    title: `Courses - Liste globale`,
    description: `Liste de courses globale pour ${plan.event?.name || params.slug}`,
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
