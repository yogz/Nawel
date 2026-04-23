import Link from "next/link";
import { headers } from "next/headers";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth-config";
import { listAllMyOutings } from "@/features/sortie/queries/outing-queries";
import { UpcomingOutingsList } from "@/features/sortie/components/upcoming-outings-list";
import { LoginLink } from "@/features/sortie/components/login-link";

export default async function SortieHome() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return <PublicHome />;
  }

  const { upcoming, past } = await listAllMyOutings(userId);
  const firstName = session?.user?.name?.split(" ")[0] ?? "Toi";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-6 pb-32 pt-12">
      <nav className="mb-10 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-encre-300">
          Sortie
        </p>
        <Link
          href="/moi"
          className="text-sm text-encre-400 transition-colors hover:text-bordeaux-600"
        >
          Mon profil →
        </Link>
      </nav>

      <header className="mb-12">
        <h1 className="text-4xl leading-[1.05] text-encre-700 sm:text-5xl">Salut {firstName}.</h1>
        <p className="mt-3 text-lg text-encre-400">
          {upcoming.length > 0
            ? `${upcoming.length} ${upcoming.length > 1 ? "sorties" : "sortie"} à venir.`
            : "Prêt·e à lancer ta prochaine sortie ?"}
        </p>
      </header>

      {upcoming.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-encre-300">
            À venir
          </h2>
          <UpcomingOutingsList outings={upcoming} />
        </section>
      )}

      {past.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-encre-300">
            Passées
          </h2>
          <UpcomingOutingsList outings={past} />
        </section>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <section className="mb-12 rounded-2xl border border-encre-100 bg-ivoire-50 p-8 text-center">
          <p className="text-lg text-encre-500">Rien encore.</p>
          <p className="mt-1 text-sm text-encre-400">
            Crée ta première sortie — un lien à partager avec tes potes.
          </p>
        </section>
      )}

      {/* Sticky FAB: on mobile it floats bottom-right, on desktop it docks
          to the top-right of the content area so it's always in reach. */}
      <Link
        href="/nouvelle"
        aria-label="Créer une sortie"
        className="fixed right-5 bottom-5 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-bordeaux-600 pr-6 pl-5 text-ivoire-50 shadow-[var(--shadow-lg)] transition-transform hover:scale-105 hover:bg-bordeaux-700 active:scale-95 sm:right-8 sm:bottom-8"
      >
        <Plus size={20} strokeWidth={2.5} />
        <span className="text-base font-semibold">Créer</span>
      </Link>
    </main>
  );
}

function PublicHome() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-6 py-20">
      <header className="flex flex-col items-start">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-bordeaux-600">
          Sortie
        </p>
        <h1 className="mb-6 text-5xl leading-[1.02] text-encre-700 sm:text-6xl">
          Qui vient,
          <br />
          <span className="text-bordeaux-600">vraiment</span> ?
        </h1>
        <p className="mb-10 max-w-md text-lg leading-relaxed text-encre-400">
          Un lien à partager, chacun répond. Pas de bordel WhatsApp pour compter qui vient, qui
          achète les places, et qui doit encore de l&rsquo;argent.
        </p>

        <Button asChild size="lg" className="px-8">
          <Link href="/nouvelle">Créer une sortie</Link>
        </Button>

        <LoginLink className="mt-4" label="J&rsquo;ai déjà un compte →" />
      </header>
    </main>
  );
}
