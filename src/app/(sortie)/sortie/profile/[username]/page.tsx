import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { listPublicProfileOutings } from "@/features/sortie/queries/outing-queries";
import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";

type Props = {
  params: Promise<{ username: string }>;
};

async function resolveUser(raw: string) {
  // Stored usernames are lowercase; compare with lower() so visitors who
  // typed `@Bob` reach Bob's profile without a redirect round-trip.
  const lookup = decodeURIComponent(raw).toLowerCase();
  const row = await db.query.user.findFirst({
    where: sql`lower(${user.username}) = ${lookup}`,
    columns: { id: true, name: true, username: true },
  });
  return row ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const row = await resolveUser(username);
  if (!row) {
    return { title: "Profil" };
  }
  return {
    title: `${row.name} · Sortie`,
    description: `Les sorties de @${row.username}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const row = await resolveUser(username);
  if (!row || !row.username) {
    notFound();
  }

  // Canonical casing: redirect `/@Bob` → `/@bob` so shares land on the
  // lowercased form the DB stores.
  if (row.username !== decoded) {
    redirect(`/@${row.username}`);
  }

  const { upcoming, past } = await listPublicProfileOutings(row.id);

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link href="/" className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700">
          ← Sortie
        </Link>
      </nav>

      <header className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
          @{row.username}
        </p>
        <h1 className="font-serif text-4xl leading-tight text-encre-700">{row.name}</h1>
      </header>

      {upcoming.length === 0 && past.length === 0 && (
        <p className="text-sm text-encre-500">Aucune sortie publique pour l&rsquo;instant.</p>
      )}

      {upcoming.length > 0 && <OutingList title="À venir" rows={upcoming} />}
      {past.length > 0 && <OutingList title="Passées" rows={past} />}
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
    <section className="mb-8">
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
    </section>
  );
}
