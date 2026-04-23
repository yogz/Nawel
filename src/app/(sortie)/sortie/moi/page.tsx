import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { listPublicProfileOutings } from "@/features/sortie/queries/outing-queries";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";
import { UsernameForm } from "@/features/sortie/components/username-form";
import { LoginLink } from "@/features/sortie/components/login-link";

export const metadata = {
  title: "Mon profil",
  robots: { index: false, follow: false },
};

export default async function ProfileSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <nav className="mb-8">
          <Link
            href="/"
            className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
          >
            ← Sortie
          </Link>
        </nav>
        <header className="mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
            Mon profil
          </p>
          <h1 className="font-serif text-4xl leading-tight text-encre-700">Connexion requise</h1>
        </header>
        <p className="mb-6 text-sm text-encre-500">
          Pour choisir un nom d&rsquo;utilisateur et afficher tes sorties publiquement, connecte-toi
          à ton compte CoList.
        </p>
        <LoginLink variant="primary" label="Se connecter" />
        <p className="mt-4 text-xs text-encre-400">
          Un email sans mot de passe t&rsquo;arrivera. Tu reviendras ici une fois connecté·e.
        </p>
      </main>
    );
  }

  const row = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { id: true, name: true, username: true },
  });

  const { upcoming, past } = await listPublicProfileOutings(session.user.id);

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link href="/" className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700">
          ← Sortie
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
          Mon profil
        </p>
        <h1 className="font-serif text-4xl leading-tight text-encre-700">
          {row?.name ?? "Anonyme"}
        </h1>
        {row?.username && (
          <p className="mt-3 text-sm text-encre-500">
            <Link
              href={`/@${row.username}`}
              className="text-bordeaux-700 underline-offset-4 hover:underline"
            >
              sortie.colist.fr/@{row.username}
            </Link>
          </p>
        )}
      </header>

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-encre-700">Nom d&rsquo;utilisateur</h2>
        <UsernameForm currentUsername={row?.username ?? null} />
      </section>

      {(upcoming.length > 0 || past.length > 0) && (
        <section>
          <h2 className="mb-4 font-serif text-xl text-encre-700">Mes sorties visibles</h2>
          {upcoming.length > 0 && <OutingList title="À venir" rows={upcoming} />}
          {past.length > 0 && <OutingList title="Passées" rows={past} />}
        </section>
      )}
    </main>
  );
}

function OutingList({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: string;
    shortId: string;
    slug: string | null;
    title: string;
    location: string | null;
    startsAt: Date | null;
  }[];
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((o) => {
          const canonical = o.slug ? `${o.slug}-${o.shortId}` : o.shortId;
          return (
            <li key={o.id}>
              <Link
                href={`/${canonical}`}
                className="flex flex-col gap-0.5 rounded-lg border border-ivoire-400 bg-ivoire-50 p-3 transition-colors hover:border-or-500"
              >
                <span className="text-sm font-medium text-encre-700">{o.title}</span>
                <span className="text-xs text-encre-400">
                  {o.startsAt ? formatOutingDateConversational(o.startsAt) : "Date à définir"}
                  {o.location ? ` · ${o.location}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
