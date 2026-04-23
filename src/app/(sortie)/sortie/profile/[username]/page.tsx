import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import {
  listMyParticipantsForOutings,
  listPublicProfileOutings,
} from "@/features/sortie/queries/outing-queries";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { UserAvatar } from "@/features/sortie/components/user-avatar";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";
import type { RsvpResponse } from "@/features/sortie/components/rsvp-sheets";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ k?: string }>;
};

async function resolveUser(raw: string) {
  // Stored usernames are lowercase; compare with lower() so visitors who
  // typed `@Bob` reach Bob's profile without a redirect round-trip.
  const lookup = decodeURIComponent(raw).toLowerCase();
  const row = await db.query.user.findFirst({
    where: sql`lower(${user.username}) = ${lookup}`,
    columns: {
      id: true,
      name: true,
      username: true,
      image: true,
      emoji: true,
      rsvpInviteToken: true,
    },
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

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const { k } = await searchParams;
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

  // Token validation is server-side only — we never expose `rsvpInviteToken`
  // to the client, and we give no signal distinguishing "no token" from
  // "wrong token" (the whole page renders as vitrine in both cases).
  const showRsvp =
    typeof k === "string" &&
    k.length > 0 &&
    row.rsvpInviteToken !== null &&
    row.rsvpInviteToken === k;

  const { upcoming, past } = await listPublicProfileOutings(row.id);
  const session = await auth.api.getSession({ headers: await headers() });
  const isSelf = session?.user?.id === row.id;

  // Only load the viewer's existing RSVPs when the token unlocks inline RSVP
  // — otherwise there's nothing to render and the round-trip is wasted.
  const cookieTokenHash = showRsvp ? await readParticipantTokenHash() : null;
  const myRsvpByOuting = showRsvp
    ? await listMyParticipantsForOutings({
        outingIds: upcoming.map((o) => o.id),
        cookieTokenHash,
        userId: session?.user?.id ?? null,
      })
    : new Map();

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700">
          ← Sortie
        </Link>
        {isSelf && (
          <Link
            href="/moi"
            className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
          >
            Modifier mon profil
          </Link>
        )}
      </nav>

      <header className="mb-10 flex items-center gap-5">
        <div className="relative">
          <UserAvatar name={row.name} image={row.image} size={72} />
          {row.emoji && (
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-ivoire-50 bg-ivoire-100 text-base"
            >
              {row.emoji}
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
            @{row.username}
          </p>
          <h1 className="font-serif text-3xl leading-tight text-encre-700 sm:text-4xl">
            {row.name}
          </h1>
        </div>
      </header>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="rounded-lg border border-ivoire-400 bg-ivoire-50 p-5 text-sm text-encre-500">
          {isSelf ? (
            <>
              <p className="mb-3">
                Ton profil est vide pour l&rsquo;instant. Crée une sortie en cochant « Afficher sur
                mon profil » et elle apparaîtra ici.
              </p>
              <Link
                href="/nouvelle"
                className="inline-flex items-center text-bordeaux-700 underline-offset-4 hover:underline"
              >
                Créer ma première sortie →
              </Link>
            </>
          ) : (
            <p>Aucune sortie publique pour l&rsquo;instant.</p>
          )}
        </div>
      )}

      {upcoming.length > 0 && (
        <OutingSection
          title="À venir"
          outings={upcoming}
          showRsvp={showRsvp}
          myRsvpByOuting={myRsvpByOuting}
          loggedInName={session?.user?.name ?? null}
          isPast={false}
        />
      )}
      {past.length > 0 && (
        <OutingSection
          title="Passées"
          outings={past}
          showRsvp={false}
          myRsvpByOuting={new Map()}
          loggedInName={session?.user?.name ?? null}
          isPast
        />
      )}
    </main>
  );
}

type OutingRow = Awaited<ReturnType<typeof listPublicProfileOutings>>["upcoming"][number];
type ParticipantRow =
  Awaited<ReturnType<typeof listMyParticipantsForOutings>> extends Map<string, infer V> ? V : never;

function OutingSection({
  title,
  outings,
  showRsvp,
  myRsvpByOuting,
  loggedInName,
  isPast,
}: {
  title: string;
  outings: OutingRow[];
  showRsvp: boolean;
  myRsvpByOuting: Map<string, ParticipantRow>;
  loggedInName: string | null;
  isPast: boolean;
}) {
  return (
    <section className="mb-10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
        {title}
      </p>
      <ul className="flex flex-col gap-4">
        {outings.map((o) => {
          const p = myRsvpByOuting.get(o.id);
          const myRsvp =
            p && (p.response === "yes" || p.response === "no" || p.response === "handle_own")
              ? {
                  response: p.response as RsvpResponse,
                  name: p.anonName ?? loggedInName ?? "",
                  extraAdults: p.extraAdults,
                  extraChildren: p.extraChildren,
                  email: p.anonEmail ?? undefined,
                }
              : null;
          return (
            <li key={o.id}>
              <OutingProfileCard
                outing={o}
                showRsvp={showRsvp}
                myRsvp={myRsvp}
                loggedInName={loggedInName}
                outingBaseUrl={PUBLIC_BASE}
                isPast={isPast}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
