import { cache } from "react";
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
import {
  bucketizeByAction,
  flattenInboxByPriority,
  type ActionBucket,
} from "@/features/sortie/lib/inbox-buckets";
import {
  CLAIM_PROMPT_DISMISS_COOKIE,
  shouldShowClaimPrompt,
} from "@/features/sortie/lib/claim-prompt";
import { UserAvatar } from "@/features/sortie/components/user-avatar";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";
import { LiveStatusHero } from "@/features/sortie/components/live-status-hero";
import { ProfileShareButton } from "@/features/sortie/components/profile-share-button";
import { InboxClaimPrompt } from "@/features/sortie/components/inbox-claim-prompt";
import { cookies } from "next/headers";
import { resolveMyRsvp } from "@/features/sortie/lib/resolve-my-rsvp";

/**
 * Seuil en dessous duquel on bypass le grouping par bucket sur la
 * checklist lien-privé : sur 1-2 cards, des headers de section bouffent
 * plus de pixels qu'ils n'en organisent. À 3 sortes asymétriques (ex:
 * 2 "à toi de jouer" + 1 "tu viens"), le grouping commence à payer.
 */
const INBOX_GROUPING_MIN_OUTINGS = 3;

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ k?: string }>;
};

// React.cache pour dédoublonner generateMetadata + Page sur la même
// requête : sinon on tape la DB 2x pour la même row user. Indexe lookup
// case-insensitive utilise user_username_lower_idx (PR 2).
const resolveUser = cache(async (raw: string) => {
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
      bio: true,
    },
  });
  return row ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const row = await resolveUser(username);
  if (!row || !row.username) {
    return { title: "Profil" };
  }

  // Format mini-agenda : la valeur d'un partage de profil c'est la *série*,
  // pas la sortie isolée. Le partage type est "voilà ce que je vais voir,
  // dites-moi si vous voulez venir" en WhatsApp/DM aux amis — donc le titre
  // affiche la densité (count) et la description liste les prochaines.
  const { upcoming, past } = await listPublicProfileOutings(row.id);
  const datedUpcoming = upcoming
    .filter((o): o is typeof o & { startsAt: Date } => o.startsAt !== null)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const url = `${PUBLIC_BASE}/@${row.username}`;

  const title = buildProfileTitle({ name: row.name, upcomingCount: upcoming.length });
  const description = buildProfileDescription({
    dated: datedUpcoming,
    totalUpcoming: upcoming.length,
    pastCount: past.length,
  });

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      locale: "fr_FR",
      siteName: "Sortie",
      // The image (and twitter:image) tags come from
      // `profile/[username]/opengraph-image.tsx` via the Next.js metadata
      // convention. The proxy passes through `/opengraph-image` paths
      // unmodified so the auto-generated URL resolves.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function buildProfileTitle(args: { name: string; upcomingCount: number }): string {
  if (args.upcomingCount === 0) {
    return `${args.name} sur Sortie`;
  }
  if (args.upcomingCount === 1) {
    return `${args.name} — 1 sortie à venir`;
  }
  return `${args.name} — ${args.upcomingCount} sorties à venir`;
}

const SHORT_DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

function buildProfileDescription(args: {
  dated: { title: string; startsAt: Date }[];
  totalUpcoming: number;
  pastCount: number;
}): string {
  if (args.totalUpcoming === 0) {
    if (args.pastCount > 0) {
      const label = args.pastCount === 1 ? "sortie passée" : "sorties passées";
      return `${args.pastCount} ${label} · la prochaine arrive bientôt.`;
    }
    return "Les prochaines sorties arriveront ici.";
  }

  // Liste compacte : 3 prochaines avec date courte ("29 avr") + nom court.
  // Vise ~140 chars pour rester sous le truncation WhatsApp/iMessage tout
  // en montrant la densité de la sélection.
  const slice = args.dated.slice(0, 3);
  const parts = slice.map(
    (o) => `${SHORT_DATE_FMT.format(o.startsAt).replace(".", "")} : ${truncateTitle(o.title, 32)}`
  );
  const overflow = args.totalUpcoming - slice.length;
  if (overflow > 0) {
    parts.push(`+${overflow} autre${overflow > 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

function truncateTitle(title: string, max: number): string {
  if (title.length <= max) {
    return title;
  }
  return `${title.slice(0, max - 1).trimEnd()}…`;
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

  // Vitrine publique : on featured la prochaine sortie en hero
  // (LiveStatusHero) pour donner une accroche au visiteur curieux.
  // Lien privé : pas de hero — l'invité doit RSVP à toutes les
  // sorties, l'asymétrie d'un hero ralentit le scan. Toutes en
  // OutingProfileCard uniformes, format Doodle / checklist.
  const heroOuting = showRsvp ? null : (upcoming.find((o) => o.startsAt !== null) ?? null);
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

  // Prompt "lance les tiennes" : invité non-loggé avec ≥2 RSVP cookie-only,
  // pas dismiss récemment. cf. claim-prompt.ts pour le predicate exact.
  const claimDismissed = (await cookies()).get(CLAIM_PROMPT_DISMISS_COOKIE)?.value === "1";
  const showClaimPrompt =
    showRsvp &&
    !session?.user &&
    !claimDismissed &&
    shouldShowClaimPrompt(Array.from(myRsvpByOuting.values()));

  // Origin pour le callbackURL OAuth — pattern hérité de /moi page (proto
  // depuis x-forwarded-proto, fallback localhost dev).
  const requestHeaders = await headers();
  const claimHost = requestHeaders.get("host") ?? "sortie.colist.fr";
  const claimProto =
    requestHeaders.get("x-forwarded-proto") ?? (claimHost.includes("localhost") ? "http" : "https");
  const claimOrigin = `${claimProto}://${claimHost}`;

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          accueil
        </Link>
        <div className="flex items-center gap-2">
          {/* Pas de partage quand l'invité arrive via le lien privé
              (`?k=token`) : il n'a aucune raison de relayer le profil
              du créateur à des tiers, et le bouton brouillerait l'idée
              que ce lien lui est personnel. Le créateur lui-même
              continue à pouvoir partager via `/moi` (modifier ↗). */}
          {!showRsvp && (
            <ProfileShareButton url={`${PUBLIC_BASE}/@${row.username}`} name={row.name} />
          )}
          {isSelf && (
            <Link
              href="/moi"
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-400 transition-colors hover:text-acid-600"
            >
              modifier ↗
            </Link>
          )}
        </div>
      </nav>

      {/* Header compact en mode lien privé : l'invité est en mode
          "checklist d'actions à faire", l'identité de l'organisateur
          n'a pas besoin d'être hero. Avatar 56px + h1 3xl gagnent
          ~80px de fold (~1 card supplémentaire visible). Vitrine
          publique (`!showRsvp`) garde le hero plein. */}
      <header className={showRsvp ? "mb-7" : "mb-10"}>
        <div className={`flex items-center ${showRsvp ? "gap-4" : "gap-5"}`}>
          <UserAvatar name={row.name} image={row.image} size={showRsvp ? 56 : 88} />
          <div className="flex-1">
            <p className="mb-2 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-acid-600">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]"
              />
              @{row.username}
            </p>
            <h1
              className={`leading-[0.95] font-black tracking-[-0.04em] text-ink-700 ${
                showRsvp ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
              }`}
              style={{ textWrap: "balance" }}
            >
              {row.name}
            </h1>
          </div>
        </div>
        {row.bio && !showRsvp && (
          <p className="mt-5 max-w-md text-[15px] leading-[1.5] text-ink-500">{row.bio}</p>
        )}
      </header>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="rounded-2xl border border-surface-400 bg-surface-100 p-5">
          {isSelf ? (
            <>
              <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-acid-600">
                ─ idle. fais le 1er pas ─
              </p>
              <p
                className="mb-3 text-[20px] leading-[1.05] font-black tracking-[-0.025em] text-ink-700"
                style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
              >
                Rien à montrer pour l&rsquo;instant.
              </p>
              <Link
                href="/nouvelle"
                className="inline-flex items-center font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600 underline-offset-4 hover:underline"
              >
                lancer ma 1ʳᵉ sortie →
              </Link>
            </>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
              ↳ aucune sortie publique pour l&rsquo;instant
            </p>
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

      {showClaimPrompt && row.username && (
        <InboxClaimPrompt creatorUsername={row.username} origin={claimOrigin} />
      )}

      {restUpcoming.length > 0 &&
        (showRsvp ? (
          <InboxSection
            outings={restUpcoming}
            myRsvpByOuting={myRsvpByOuting}
            loggedInName={session?.user?.name ?? null}
          />
        ) : (
          <OutingSection
            title="À venir"
            outings={restUpcoming}
            showRsvp={showRsvp}
            myRsvpByOuting={myRsvpByOuting}
            loggedInName={session?.user?.name ?? null}
            isPast={false}
          />
        ))}

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
      <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-hot-500">
        ─ passées ─
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
        <details className="group mt-4 border-t border-surface-400 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:text-acid-600">
            <span>+ voir les {String(hidden.length).padStart(2, "0")} autres</span>
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

/**
 * Mode lien-privé uniquement : la liste des sorties à venir est groupée
 * par état d'action côté invité (à toi de jouer / tu viens / en attente
 * / tu viens pas) plutôt que chronologique. Transforme la page en
 * checklist au lieu d'un agenda.
 *
 * Sous le seuil `INBOX_GROUPING_MIN_OUTINGS`, on retombe sur une liste
 * plate triée par priorité d'action : sur 1-2 cards, des headers de
 * section pèsent plus que la lecture qu'ils organisent.
 *
 * Le bucket "tu viens pas" reste **visible muet** (opacité réduite, pas
 * de `<details>` caché) — cacher la rétractation force un geste de
 * découverte sur l'edge case émotionnellement le plus coûteux. Cf.
 * review UX devil's avocate / IA.
 */
function InboxSection({
  outings,
  myRsvpByOuting,
  loggedInName,
}: {
  outings: OutingRow[];
  myRsvpByOuting: Map<string, ParticipantRow>;
  loggedInName: string | null;
}) {
  const buckets = bucketizeByAction(outings, myRsvpByOuting);

  if (outings.length < INBOX_GROUPING_MIN_OUTINGS) {
    return (
      <section className="mb-10">
        <RsvpCardList
          outings={flattenInboxByPriority(buckets)}
          myRsvpByOuting={myRsvpByOuting}
          loggedInName={loggedInName}
          showRsvp
          isPast={false}
        />
      </section>
    );
  }

  return (
    <div className="mb-10 flex flex-col gap-8">
      {buckets
        .filter((b) => b.outings.length > 0)
        .map((bucket) => (
          <InboxBucketSection
            key={bucket.key}
            bucket={bucket}
            myRsvpByOuting={myRsvpByOuting}
            loggedInName={loggedInName}
          />
        ))}
    </div>
  );
}

function InboxBucketSection({
  bucket,
  myRsvpByOuting,
  loggedInName,
}: {
  bucket: ActionBucket<OutingRow>;
  myRsvpByOuting: Map<string, ParticipantRow>;
  loggedInName: string | null;
}) {
  // "Tu viens pas" déjà décliné = info passée. Opacité baissée pour
  // que l'œil passe sans s'arrêter, sans cacher (rétractation + signal
  // social préservés).
  const muted = bucket.key === "declined";
  return (
    <section className={muted ? "opacity-60" : undefined}>
      <p className="mb-3 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-hot-500">
        <span>─ {bucket.label} ─</span>
        <span className="text-ink-400">{String(bucket.outings.length).padStart(2, "0")}</span>
      </p>
      <RsvpCardList
        outings={bucket.outings}
        myRsvpByOuting={myRsvpByOuting}
        loggedInName={loggedInName}
        showRsvp
        isPast={false}
      />
    </section>
  );
}

function RsvpCardList({
  outings,
  myRsvpByOuting,
  loggedInName,
  showRsvp,
  isPast,
}: {
  outings: OutingRow[];
  myRsvpByOuting: Map<string, ParticipantRow>;
  loggedInName: string | null;
  showRsvp: boolean;
  isPast: boolean;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {outings.map((o) => (
        <li key={o.id}>
          <OutingProfileCard
            outing={o}
            showRsvp={showRsvp}
            myRsvp={resolveMyRsvp(myRsvpByOuting.get(o.id), loggedInName)}
            loggedInName={loggedInName}
            outingBaseUrl={PUBLIC_BASE}
            isPast={isPast}
          />
        </li>
      ))}
    </ul>
  );
}

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
      <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-hot-500">
        ─ {title.toLowerCase()} ─
      </p>
      <RsvpCardList
        outings={outings}
        myRsvpByOuting={myRsvpByOuting}
        loggedInName={loggedInName}
        showRsvp={showRsvp}
        isPast={isPast}
      />
    </section>
  );
}
