import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth-config";
import { listMyOutingsForProfile } from "@/features/sortie/queries/outing-queries";
import { UpcomingOutingsList } from "@/features/sortie/components/upcoming-outings-list";
import { LoginLink } from "@/features/sortie/components/login-link";

export default async function SortieHome() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  const myOutings = userId ? await listMyOutingsForProfile(userId, 6) : [];
  const isLoggedIn = Boolean(userId);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-6 py-20">
      <header className="flex flex-col items-start">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
          Sortie
        </p>
        <h1 className="mb-5 font-serif text-5xl leading-[1.05] text-encre-700 sm:text-6xl">
          Qui vient au théâtre&nbsp;?
        </h1>
        <div className="sortie-filet my-6">
          <span className="sortie-filet-diamond" />
        </div>
        <p className="mb-10 max-w-md text-lg leading-relaxed text-encre-500">
          Un lien à partager, et chacun répond. Pas de bordel WhatsApp pour compter qui vient, qui
          achète les places, et qui doit encore de l&rsquo;argent.
        </p>

        <Button asChild size="lg" className="px-6">
          <Link href="/nouvelle">Créer une sortie</Link>
        </Button>

        {isLoggedIn ? (
          <Link
            href="/moi"
            className="mt-4 text-sm text-encre-400 underline-offset-4 transition-colors hover:text-bordeaux-700 hover:underline"
          >
            Mon profil →
          </Link>
        ) : (
          <LoginLink className="mt-4" label="Se connecter →" />
        )}
      </header>

      {myOutings.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-serif text-2xl text-encre-700">Tes sorties à venir</h2>
          <UpcomingOutingsList outings={myOutings} />
        </section>
      )}
    </main>
  );
}
