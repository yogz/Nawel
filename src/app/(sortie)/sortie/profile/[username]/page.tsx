import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
import { LiveStatusHero } from "@/features/sortie/components/live-status-hero";
import { ProfileShareButton } from "@/features/sortie/components/profile-share-button";
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

  // Pull out the featured outing for the hero — first upcoming that has
  // a concrete date. Vote-mode outings without a chosen slot fall back
  // into the regular card list below (no date → no relative "dans N
  // jours" to show in the hero). Skipping by `.slice(1)` later keeps
  // the list from duplicating the hero.
  const heroOuting = upcoming.find((o) => o.startsAt !== null) ?? null;
  const restUpcoming = heroOuting ? upcoming.filter((o) => o.id !== heroOuting.id) : upcoming;

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
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Accueil
        </Link>
        <div className="flex items-center gap-2">
          <ProfileShareButton url={`${PUBLIC_BASE}/@${row.username}`} name={row.name} />
          {isSelf && (
            <Link
              href="/moi"
              className="text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
            >
              Modifier
            </Link>
          )}
        </div>
      </nav>

      <header className="mb-10 flex items-center gap-5">
        <UserAvatar name={row.name} image={row.image} size={72} />
        <div className="flex-1">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
            @{row.username}
          </p>
          <h1 className="font-serif text-4xl leading-[1.02] tracking-tight text-encre-700 sm:text-5xl">
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

      {heroOuting && heroOuting.startsAt && (
        <LiveStatusHero
          slug={heroOuting.slug}
          shortId={heroOuting.shortId}
          title={heroOuting.title}
          location={heroOuting.location}
          startsAt={heroOuting.startsAt}
          confirmed={heroOuting.confirmedCount}
          heroImageUrl={heroOuting.heroImageUrl}
          eyebrow={isSelf ? "Ta prochaine sortie" : "Prochaine sortie"}
        />
      )}

      {restUpcoming.length > 0 && (
        <OutingSection
          title="À venir"
          outings={restUpcoming}
          showRsvp={showRsvp}
          myRsvpByOuting={myRsvpByOuting}
          loggedInName={session?.user?.name ?? null}
          isPast={false}
        />
      )}

      {past.length > 0 && <PastSection outings={past} loggedInName={session?.user?.name ?? null} />}
    </main>
  );
}

/**
 * Past outings: show up to 3 inline (proves the profile is alive as a
 * taste portfolio), hide the rest behind a <details> disclosure. For
 * short histories (≤ 3 past outings) the disclosure never shows —
 * everything stays flat.
 */
function PastSection({
  outings,
  loggedInName,
}: {
  outings: OutingRow[];
  loggedInName: string | null;
}) {
  const inline = outings.slice(0, 3);
  const hidden = outings.slice(3);

  return (
    <section className="mb-10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
        Passées
      </p>
      <ul className="flex flex-col gap-4">
        {inline.map((o) => (
          <li key={o.id}>
            <OutingProfileCard
              outing={o}
              showRsvp={false}
              myRsvp={null}
              loggedInName={loggedInName}
              outingBaseUrl={PUBLIC_BASE}
              isPast
            />
          </li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <details className="group mt-4 border-t border-encre-100 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-encre-400 transition-colors hover:text-bordeaux-700">
            <span>Voir les {hidden.length} autres</span>
            <ChevronRight
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
              className="transition-transform duration-200 group-open:rotate-90"
            />
          </summary>
          <ul className="mt-4 flex flex-col gap-4">
            {hidden.map((o) => (
              <li key={o.id}>
                <OutingProfileCard
                  outing={o}
                  showRsvp={false}
                  myRsvp={null}
                  loggedInName={loggedInName}
                  outingBaseUrl={PUBLIC_BASE}
                  isPast
                />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
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
  function resolveMyRsvp(p: ParticipantRow | undefined) {
    if (!p || (p.response !== "yes" && p.response !== "no" && p.response !== "handle_own")) {
      return null;
    }
    return {
      response: p.response as RsvpResponse,
      name: p.anonName ?? loggedInName ?? "",
      extraAdults: p.extraAdults,
      extraChildren: p.extraChildren,
      email: p.anonEmail ?? undefined,
    };
  }

  return (
    <section className="mb-10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
        {title}
      </p>
      <ul className="flex flex-col gap-4">
        {outings.map((o) => (
          <li key={o.id}>
            <OutingProfileCard
              outing={o}
              showRsvp={showRsvp}
              myRsvp={resolveMyRsvp(myRsvpByOuting.get(o.id))}
              loggedInName={loggedInName}
              outingBaseUrl={PUBLIC_BASE}
              isPast={isPast}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
