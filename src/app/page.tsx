import { getMyEventsAction } from "@/app/actions";
import { EventList } from "@/components/event-list";
import { Landing } from "@/components/landing";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { UserNav } from "@/components/auth/user-nav";

// ISR: revalidate every 60 seconds
export const revalidate = 60;

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <Landing />;
  }

  const events = await getMyEventsAction();
  const searchParams = await props.searchParams;
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-6 pb-24">
      <div className="mb-4 flex justify-end">
        <UserNav />
      </div>
      <div className="mb-8 pt-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Tableau de bord 🎄</p>
        <h1 className="mt-2 text-3xl font-bold">Mes Événements ✨</h1>
        <p className="mt-2 text-gray-600">Retrouvez tous vos événements en un seul endroit.</p>
      </div>

      <EventList events={events} writeEnabled={true} writeKey={key} />
    </main>
  );
}
