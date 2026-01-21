import { fetchPlan } from "@/lib/queries";
import { isWriteKeyValid } from "@/lib/auth";
import { QuickAddPage } from "@/components/planning/quick-add-page";
import { setRequestLocale } from "next-intl/server";

export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  setRequestLocale(params.locale);

  const plan = await fetchPlan(params.slug);

  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;
  const serviceId =
    typeof searchParams?.service === "string" ? parseInt(searchParams.service, 10) : undefined;
  const writeEnabled = isWriteKeyValid(key, plan.event?.adminKey ?? null);

  return (
    <QuickAddPage
      initialPlan={plan}
      slug={params.slug}
      writeKey={key}
      writeEnabled={writeEnabled}
      initialServiceId={serviceId}
    />
  );
}
