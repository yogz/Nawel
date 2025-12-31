import { LandingStory } from "@/components/landing-story";
import { setRequestLocale } from "next-intl/server";

export default async function Demo2Page(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <LandingStory />;
}
