import Link from "next/link";
import { getAllEventsAction, createEventAction } from "./actions";
import { isWriteKeyValid } from "@/lib/auth";
import { EventList } from "@/components/event-list";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const events = await getAllEventsAction();
  const key = typeof searchParams?.key === "string" ? searchParams.key : undefined;

  // Creation is now public/generated, so we enable it for everyone.
  // The 'writeKey' param is still passed to pre-fill if present, though less relevant now.
  const writeEnabled = true;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Organisateur d&apos;événements 🎄</p>
        <h1 className="mt-2 text-3xl font-bold">Coordonnez vos repas de fêtes, tout simplement ✨</h1>
        <p className="mt-2 text-gray-600">
          Partagez le lien avec votre famille pour que chacun puisse choisir ce qu&apos;il apporte ! 🎁
        </p>
      </div>

      <EventList events={events} writeEnabled={writeEnabled} writeKey={key} />
    </main>
  );
}
