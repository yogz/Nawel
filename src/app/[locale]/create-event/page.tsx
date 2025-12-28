import { setRequestLocale } from "next-intl/server";
import CreateEventClient from "./create-event-client";

export default async function CreateEventPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <CreateEventClient />;
}
