import { getAllEventsAction } from "@/app/actions";
import { EventList } from "@/components/event-list";

export const dynamic = "force-dynamic";

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const events = await getAllEventsAction();
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;

  // Events visible to the user:
  // 1. All events (currently public)
  // 2. OR filter? For now let's keep it simple as requested: "propriétaire de l'événement"
  // If the user is logged in, they can see their events marked somehow?
  // Or just enable editing for them.

  const writeEnabled = true;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-6 pb-24">
      <div className="mb-8 pt-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
          Organisateur d&apos;événements 🎄
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Coordonnez vos repas de fêtes, tout simplement ✨
        </h1>
        <p className="mt-2 text-gray-600">
          Partagez le lien avec votre famille pour que chacun puisse choisir ce qu&apos;il apporte !
          🎁
        </p>
      </div>

      <EventList events={events} writeEnabled={writeEnabled} writeKey={key} />
    </main>
  );
}
