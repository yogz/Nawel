import { MarketingKit } from "@/components/marketing-kit";
import { setRequestLocale } from "next-intl/server";

export default async function MarketingKitPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <MarketingKit />;
}
