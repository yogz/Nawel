import { LandingVariantB } from "@/components/landing";
import { setRequestLocale } from "next-intl/server";

export default async function DemoPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <LandingVariantB />;
}
