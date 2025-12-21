import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Christmas organizer 🎄</p>
        <h1 className="text-3xl font-bold">Coordonnez vos repas de fêtes, tout simplement ✨</h1>
        <p className="text-gray-600">
          Partagez le lien avec votre famille pour que chacun puisse choisir ce qu&apos;il apporte ! 🎁
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
