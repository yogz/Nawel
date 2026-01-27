import { LandingVariantC } from "@/components/landing/landing-variant-c";
import { setRequestLocale } from "next-intl/server";

export default async function Home(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  // Use LandingVariantC directly to avoid A/B test flash
  return <LandingVariantC />;
}
