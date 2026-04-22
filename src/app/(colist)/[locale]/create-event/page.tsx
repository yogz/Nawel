import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CreateEventClient from "./create-event-client";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "CreateEvent" });
  return {
    title: t("title"),
  };
}

export default async function CreateEventPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <CreateEventClient />;
}
