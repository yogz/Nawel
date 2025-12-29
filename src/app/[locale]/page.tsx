import { getMyEventsAction } from "@/app/actions";
import { UserNav } from "@/components/auth/user-nav";
import { EventList } from "@/components/event-list";
import { Landing } from "@/components/landing";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

// ISR: revalidate every 60 seconds
export const revalidate = 60;

export default async function Home(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <Landing />;
  }

  const t = await getTranslations("Dashboard");
  const events = await getMyEventsAction();
  const searchParams = await props.searchParams;
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-6 pb-24">
      <div className="mb-4 flex justify-end">
        <UserNav />
      </div>
      <div className="mb-8 pt-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{t("badge")}</p>
        <h1 className="mt-2 text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>

      <EventList events={events} writeEnabled writeKey={key} />
    </main>
  );
}
