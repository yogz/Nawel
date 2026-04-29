import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { debts, purchases } from "@drizzle/sortie-schema";
import { getMyParticipant, getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { resolveBackLink } from "@/features/sortie/lib/back-link";
import { buildOutingShareMeta } from "@/features/sortie/lib/outing-share-meta";
import { getCreatorFirstName } from "@/features/sortie/lib/creator-display";
import { CreateSuccessBanner } from "@/features/sortie/components/create-success-banner";
import { OutingHero } from "@/features/sortie/components/outing-hero";
import { ParticipantList } from "@/features/sortie/components/participant-list";
import { DeadlineBadge } from "@/features/sortie/components/deadline-badge";
import { ReclaimForm } from "@/features/sortie/components/reclaim-form";
import { RsvpPrompt } from "@/features/sortie/components/rsvp-prompt";
import { ScrollToActionFab } from "@/features/sortie/components/scroll-to-action-fab";
import { ShareActions } from "@/features/sortie/components/share-actions";
import { VoteRsvpSheet } from "@/features/sortie/components/vote-rsvp-sheet";
import { VotingSection } from "@/features/sortie/components/voting-section";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

type Props = {
  params: Promise<{ slugOrId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    return { title: "Sortie" };
  }
  const outing = await getOutingByShortId(shortId);
  if (!outing) {
    return { title: "Sortie" };
  }

  const meta = buildOutingShareMeta(outing);
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  const url = `${PUBLIC_BASE}/${canonical}`;

  return {
    title: meta.ogTitle,
    description: meta.ogDescription || undefined,
    // `noindex` protects search visibility only — WhatsApp / iMessage / Signal
    // ignore it and will still fetch the preview. Confidentiality lives in the
    // opaque `shortId`, not in robots.
    robots: { index: false, follow: false },
    openGraph: {
      title: meta.ogTitle,
      description: meta.ogDescription || undefined,
      url,
      type: "website",
      locale: "fr_FR",
      siteName: "Sortie",
      // The image (and twitter:image) tags are populated by the
      // `[slugOrId]/opengraph-image.tsx` convention. The proxy passes
      // through `/opengraph-image` paths so the auto-generated
      // `/sortie/<slugOrId>/opengraph-image-<hash>` URL resolves.
    },
    twitter: {
      card: "summary_large_image",
      title: meta.ogTitle,
      description: meta.ogDescription || undefined,
    },
  };
}

export default async function OutingPublicPage({ params, searchParams }: Props) {
  const { slugOrId } = await params;
  const { from } = await searchParams;
  const justCreated = from === "create";
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    notFound();
  }

  const outing = await getOutingByShortId(shortId);
  if (!outing) {
    notFound();
  }

  // Canonical redirect: /<shortId> → /<slug>-<shortId> when a slug is known.
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  if (canonical !== slugOrId) {
    redirect(`/${canonical}`);
  }

  const h = await headers();
  const back = resolveBackLink(h.get("referer"), h.get("host"));
  const session = await auth.api.getSession({ headers: h });
  const cookieTokenHash = await readParticipantTokenHash();
  const isCreator =
    (session?.user && session.user.id === outing.creatorUserId) ||
    (outing.creatorCookieTokenHash !== null && outing.creatorCookieTokenHash === cookieTokenHash);
  const me = cookieTokenHash
    ? await getMyParticipant({
        outingId: outing.id,
        cookieTokenHash,
        userId: session?.user?.id ?? null,
      })
    : null;

  if (outing.status === "cancelled") {
    return <CancelledView title={outing.title} />;
  }

  const deadlinePassed = outing.deadlineAt < new Date();

  // Money-layer context : 3 queries indépendantes (purchase + debts debtor +
  // debts creditor) parallélisées — économise 2 RTT DB sur le hot path.
  const [existingPurchase, myMoneyRow, myCreditRow] = await Promise.all([
    db.query.purchases.findFirst({ where: eq(purchases.outingId, outing.id) }),
    me
      ? db.query.debts.findFirst({
          where: and(eq(debts.outingId, outing.id), eq(debts.debtorParticipantId, me.id)),
        })
      : Promise.resolve(null),
    me
      ? db.query.debts.findFirst({
          where: and(eq(debts.outingId, outing.id), eq(debts.creditorParticipantId, me.id)),
        })
      : Promise.resolve(null),
  ]);
  const viewerIsConfirmed = me?.response === "yes";
  const viewerHasMoneyRow = Boolean(myMoneyRow || myCreditRow);
  // Creator's first name for the WhatsApp share opening — "Léa t'invite : …".
  // Shared between the post-creation banner and the regular share row.
  const creatorFirstName = getCreatorFirstName(outing);

  // The RSVP picker gets pinned to the bottom of the viewport when the
  // visitor hasn't answered yet — it's the single most important action
  // on the page, and burying it below the participant list + deadline
  // badge costs conversion on long guest lists. Once answered, the
  // prompt renders inline (chips + modifier / retirer links) since the
  // action becomes secondary.
  const shouldStickRsvp =
    !deadlinePassed && !me?.response && !(outing.mode === "vote" && !outing.chosenTimeslotId);

  // FAB "Je vote ↓" affiché en mode sondage actif tant que le
  // visiteur n'a pas voté. Il flotte tant que la zone d'action n'est
  // pas dans le viewport et disparaît dès qu'il y arrive — pour
  // qu'un invité qui scrolle dans les détails de la sortie ne perde
  // pas l'action principale de vue. En mode fixed (et vote-with-
  // chosen) le `RsvpPrompt` sticky bottom prend déjà ce rôle.
  const hasVotedAlready = Boolean(
    me && outing.timeslots.some((t) => t.votes.some((v) => v.participantId === me.id))
  );
  const showVoteFab =
    outing.mode === "vote" && !outing.chosenTimeslotId && !deadlinePassed && !hasVotedAlready;

  return (
    <main className={`relative mx-auto max-w-xl px-6 ${shouldStickRsvp ? "pb-44" : "pb-24"}`}>
      {/* Top nav floats over the full-bleed hero. The pill backgrounds
          sit on a backdrop blur so the affordances stay readable on
          any photo, including ones with a busy upper third. */}
      <nav
        className="absolute inset-x-6 z-30 flex items-center justify-between"
        style={{ top: "max(env(safe-area-inset-top), 1rem)" }}
      >
        <Link
          href={back.href}
          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-700 backdrop-blur-md transition-colors hover:bg-black/55"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {back.label}
        </Link>
        {isCreator && (
          <Link
            href={`/${canonical}/modifier`}
            className="inline-flex h-11 items-center rounded-full border border-white/15 bg-black/35 px-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-700 backdrop-blur-md transition-colors hover:bg-black/55"
          >
            modifier ↗
          </Link>
        )}
      </nav>

      <OutingHero
        title={outing.title}
        location={outing.location}
        startsAt={outing.fixedDatetime}
        ticketUrl={outing.eventLink}
        heroImageUrl={outing.heroImageUrl}
        canonicalPath={canonical}
      />

      {/* Just-created state: surface le banner sous le hero (titre +
          image), en flow normal. L'overlay absolute des versions
          précédentes posait sur l'image — depuis qu'on a déplacé le
          titre au-dessus de l'image, l'overlay recouvrait justement
          ce titre. Mieux : laisser le banner prendre sa place dans
          la pile, le poster reste l'ancre visuelle juste avant. */}
      {justCreated && isCreator && (
        <div className="mb-4">
          <CreateSuccessBanner
            url={`${PUBLIC_BASE}/${canonical}`}
            title={outing.title}
            startsAt={outing.fixedDatetime}
            firstName={creatorFirstName}
          />
        </div>
      )}

      {/* Le partage est une action de créateur — c'est lui qui a la
          mission d'inviter du monde. Un invité qui arrive via un lien
          WhatsApp est dans le flow de réception, pas de répartage ;
          lui montrer un bouton "Partager" suggère à tort qu'il est en
          charge de propager le lien. On le cache donc pour les
          non-créateurs. Le banner post-create est déjà soumis à
          `isCreator`, donc cohérent. */}
      {isCreator && !justCreated && (
        <div className="mb-4">
          <ShareActions
            url={`${PUBLIC_BASE}/${canonical}`}
            title={outing.title}
            startsAt={outing.fixedDatetime}
            firstName={creatorFirstName}
          />
        </div>
      )}

      <section
        className="mt-10 overflow-hidden rounded-[28px] border border-surface-400 bg-surface-100 p-6 shadow-[var(--shadow-velvet)]"
        aria-label="Les confirmés"
      >
        <ParticipantList participants={outing.participants} isCreator={isCreator} />

        <div className="mt-6 border-t border-surface-400 pt-4 text-center">
          <DeadlineBadge deadlineAt={outing.deadlineAt} />
        </div>
      </section>

      {outing.mode === "vote" && outing.timeslots.length > 0 && (
        <VotingSection
          shortId={outing.shortId}
          chosenTimeslotId={outing.chosenTimeslotId}
          isCreator={isCreator}
          totalVoters={countVoters(outing.timeslots)}
          timeslots={outing.timeslots.map((t) => ({
            id: t.id,
            startsAt: t.startsAt,
            yesCount: t.votes.filter((v) => v.available).length,
            noCount: t.votes.filter((v) => !v.available).length,
          }))}
        />
      )}

      {!deadlinePassed && outing.mode === "vote" && !outing.chosenTimeslotId && (
        <div id="vote-action" className="mt-8 flex justify-center">
          <VoteRsvpSheet
            shortId={outing.shortId}
            timeslots={outing.timeslots.map((t) => ({ id: t.id, startsAt: t.startsAt }))}
            existingVotes={
              me
                ? Object.fromEntries(
                    outing.timeslots.flatMap((t) =>
                      t.votes
                        .filter((v) => v.participantId === me.id)
                        .map((v) => [t.id, v.available])
                    )
                  )
                : {}
            }
            existingName={me?.anonName ?? session?.user?.name ?? undefined}
            existingEmail={me?.anonEmail ?? undefined}
            existingExtraAdults={me?.extraAdults ?? undefined}
            existingExtraChildren={me?.extraChildren ?? undefined}
            hasVoted={Boolean(
              me && outing.timeslots.some((t) => t.votes.some((v) => v.participantId === me.id))
            )}
          />
        </div>
      )}

      {!deadlinePassed && !(outing.mode === "vote" && !outing.chosenTimeslotId) && me?.response && (
        <div className="mt-8">
          <RsvpPrompt
            shortId={outing.shortId}
            existingResponse={
              me.response === "yes" || me.response === "no" || me.response === "handle_own"
                ? (me.response as "yes" | "no" | "handle_own")
                : null
            }
            existingName={me.anonName ?? undefined}
            existingExtraAdults={me.extraAdults ?? 0}
            existingExtraChildren={me.extraChildren ?? 0}
            existingEmail={me.anonEmail ?? undefined}
            loggedInName={session?.user?.name ?? undefined}
            outingTitle={outing.title}
            outingUrl={`${PUBLIC_BASE}/${canonical}`}
            outingDate={outing.fixedDatetime}
          />
        </div>
      )}

      {viewerIsConfirmed && (
        <nav className="mt-8 flex flex-wrap justify-center gap-3 text-sm" aria-label="Argent">
          {!existingPurchase && (
            <Link
              href={`/${canonical}/achat`}
              className="inline-flex h-11 items-center rounded-full border border-hot-500 bg-hot-50 px-4 font-medium text-hot-500 transition-all hover:border-hot-400 hover:bg-hot-100 hover:text-hot-400"
            >
              Déclarer l&rsquo;achat
            </Link>
          )}
          {viewerHasMoneyRow && (
            <Link
              href={`/${canonical}/dettes`}
              className="inline-flex h-11 items-center rounded-full border border-surface-400 bg-surface-100 px-4 text-ink-600 transition-colors hover:border-acid-600 hover:text-acid-600"
            >
              Voir les dettes
            </Link>
          )}
          <Link
            href={`/${canonical}/paiement`}
            className="inline-flex h-11 items-center rounded-full border border-surface-400 bg-surface-100 px-4 text-ink-600 transition-colors hover:border-acid-600 hover:text-acid-600"
          >
            Mes moyens de paiement
          </Link>
        </nav>
      )}

      {(outing.creatorAnonName || outing.creatorUserId) && (
        <p className="mt-8 text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-400">
          ↳ organisé par{" "}
          {outing.creatorUser?.username ? (
            // Le créateur a un handle public — on en fait un lien vers
            // son profil pour activer la dimension sociale au lieu de
            // dire "un membre colist" anonyme.
            <Link
              href={`/@${outing.creatorUser.username}`}
              className="text-ink-500 underline-offset-4 transition-colors duration-300 hover:text-acid-600 hover:underline"
            >
              @{outing.creatorUser.username}
            </Link>
          ) : (
            <span className="text-ink-500">
              {outing.creatorAnonName ?? outing.creatorUser?.name ?? "un membre colist"}
            </span>
          )}
        </p>
      )}

      {!isCreator && outing.creatorAnonEmail && (
        <div className="mt-8 flex justify-center">
          <ReclaimForm shortId={outing.shortId} />
        </div>
      )}

      {showVoteFab && <ScrollToActionFab targetId="vote-action" label="Je vote" />}

      {shouldStickRsvp && (
        <div
          className="fixed inset-x-0 z-40 mx-auto max-w-[520px] border-t border-surface-400 bg-[var(--sortie-bg)]/92 backdrop-blur-md"
          style={{
            bottom: 0,
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            paddingTop: "0.75rem",
          }}
        >
          <div className="mx-auto flex max-w-xl flex-col gap-2 px-6">
            <RsvpPrompt
              shortId={outing.shortId}
              existingResponse={null}
              existingName={me?.anonName ?? undefined}
              existingExtraAdults={me?.extraAdults ?? 0}
              existingExtraChildren={me?.extraChildren ?? 0}
              existingEmail={me?.anonEmail ?? undefined}
              loggedInName={session?.user?.name ?? undefined}
              outingTitle={outing.title}
              outingUrl={`${PUBLIC_BASE}/${canonical}`}
              outingDate={outing.fixedDatetime}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function countVoters(timeslots: Array<{ votes: Array<{ participantId: string }> }>): number {
  const unique = new Set<string>();
  for (const t of timeslots) {
    for (const v of t.votes) {
      unique.add(v.participantId);
    }
  }
  return unique.size;
}

function CancelledView({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-hot-500">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-hot-500 shadow-[0_0_10px_var(--sortie-hot)]"
        />
        ─ annulée ─
      </p>
      <h1 className="mb-4 text-4xl leading-[1] font-black tracking-[-0.04em] text-ink-700 line-through decoration-hot-500 decoration-2">
        {title}
      </h1>
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-500">
        on se rattrape au prochain ?
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600 underline-offset-4 hover:underline"
      >
        ← retour à l&rsquo;accueil
      </Link>
    </main>
  );
}
