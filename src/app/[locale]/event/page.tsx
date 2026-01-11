import { getMyEventsAction } from "@/app/actions";
import { EventList } from "@/components/events/event-list";
import { DashboardHeader, DashboardFooter } from "@/components/layout";
import { OnboardingTour } from "@/components/common/onboarding-tour";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";

// ISR: revalidate every 60 seconds
export const revalidate = 60;

export default async function EventDashboard(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to login if not authenticated
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const events = await getMyEventsAction();
  const searchParams = await props.searchParams;
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;

  return (
    <div className="flex min-h-screen flex-col text-gray-900">
      <DashboardHeader />

      <div className="mx-auto w-full max-w-3xl flex-1">
        <main id="event-list-container" className="space-y-4 px-4 py-6 sm:px-3 sm:py-4">
          <EventList events={events} writeEnabled writeKey={key} />
          <DashboardFooter />
        </main>
      </div>

      <OnboardingTour tourKey="dashboard" />
    </div>
  );
}
