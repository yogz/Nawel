import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Christmas organizer</p>
        <h1 className="text-3xl font-bold">Coordinating who brings what, simplified.</h1>
        <p className="text-gray-600">
          Share the event link and an optional write key to let your family assign dishes and ingredients.
        </p>
      </div>
      <Link
        href="/noel/family"
        className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Open planner
      </Link>
    </main>
  );
}
