import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { Organizer } from "@/components/planning/organizer";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function Page({ params, searchParams }: Props) {
  const plan = await fetchPlan();
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const writeEnabled = isWriteKeyValid(key);

  return <Organizer initialPlan={plan} slug={params.slug} writeKey={key} writeEnabled={writeEnabled} />;
}
