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
  // Cache-bust the OG image on every RSVP so the live social-proof count
  // is reflected when the link is re-shared. WhatsApp caches aggressively
  // but respects a changed query string as a new asset.
  const ogImageUrl = `${PUBLIC_BASE}/${canonical}/opengraph-image?v=${meta.confirmedCount}`;
  const ogAlt = meta.isCancelled
    ? "Sortie annulée"
    : `${outing.title}${meta.firstName ? ` — invitation de ${meta.firstName}` : ""}`;

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
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogAlt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.ogTitle,
      description: meta.ogDescription || undefined,
      images: [ogImageUrl],
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

  // Money-layer context: does a purchase exist, does the viewer have debts or
  // credits on this outing? Drives the "Déclarer l'achat" / "Voir les dettes"
  // CTAs further down.
  const existingPurchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  const myMoneyRow = me
    ? await db.query.debts.findFirst({
        where: and(
          eq(debts.outingId, outing.id),
          // OR (debtor or creditor) — Drizzle builder:
          // we use two queries rather than OR to keep the types clean.
          eq(debts.debtorParticipantId, me.id)
        ),
      })
    : null;
  const myCreditRow = me
    ? await db.query.debts.findFirst({
        where: and(eq(debts.outingId, outing.id), eq(debts.creditorParticipantId, me.id)),
      })
    : null;
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

  return (
    <main className={`mx-auto max-w-xl px-6 pt-10 ${shouldStickRsvp ? "pb-44" : "pb-24"}`}>
      <nav className="mb-6 flex items-center justify-between">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-encre-400 transition-colors hover:text-bordeaux-700"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          {back.label}
        </Link>
        {isCreator && (
          <Link
            href={`/${canonical}/modifier`}
            className="text-xs text-encre-300 transition-colors hover:text-encre-500"
          >
            Modifier la sortie
          </Link>
        )}
      </nav>

      {justCreated && isCreator && (
        <CreateSuccessBanner
          url={`${PUBLIC_BASE}/${canonical}`}
          title={outing.title}
          startsAt={outing.fixedDatetime}
          firstName={creatorFirstName}
        />
      )}

      {!(justCreated && isCreator) && (
        <div className="mb-4 flex justify-end">
          <ShareActions
            url={`${PUBLIC_BASE}/${canonical}`}
            title={outing.title}
            startsAt={outing.fixedDatetime}
            firstName={creatorFirstName}
          />
        </div>
      )}

      <OutingHero
        title={outing.title}
        location={outing.location}
        startsAt={outing.fixedDatetime}
        ticketUrl={outing.eventLink}
        heroImageUrl={outing.heroImageUrl}
        canonicalPath={canonical}
      />

      <section
        className="mt-10 rounded-t-[2rem] rounded-b-[1rem] bg-ivoire-50 p-6 shadow-[var(--shadow-velvet)]"
        aria-label="Les confirmés"
      >
        <ParticipantList participants={outing.participants} />

        <div className="mt-6 border-t border-ivoire-400 pt-4 text-center">
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
        <div className="mt-8 flex justify-center">
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
              className="inline-flex items-center rounded-full border border-bordeaux-600 bg-bordeaux-50 px-4 py-2 text-bordeaux-700 transition-colors hover:bg-bordeaux-100"
            >
              Déclarer l&rsquo;achat
            </Link>
          )}
          {viewerHasMoneyRow && (
            <Link
              href={`/${canonical}/dettes`}
              className="inline-flex items-center rounded-full border border-ivoire-400 bg-ivoire-50 px-4 py-2 text-encre-600 transition-colors hover:border-or-500 hover:text-bordeaux-700"
            >
              Voir les dettes
            </Link>
          )}
          <Link
            href={`/${canonical}/paiement`}
            className="inline-flex items-center rounded-full border border-ivoire-400 bg-ivoire-50 px-4 py-2 text-encre-600 transition-colors hover:border-or-500 hover:text-bordeaux-700"
          >
            Mes moyens de paiement
          </Link>
        </nav>
      )}

      <p className="mt-6 text-center text-sm text-encre-400">
        {outing.creatorAnonName || outing.creatorUserId
          ? `Organisé par ${outing.creatorAnonName ?? "un membre CoList"}.`
          : ""}
      </p>

      {!isCreator && outing.creatorAnonEmail && (
        <div className="mt-8 flex justify-center">
          <ReclaimForm shortId={outing.shortId} />
        </div>
      )}

      {shouldStickRsvp && (
        <div
          className="fixed inset-x-0 z-40 border-t border-encre-700/5 bg-[var(--sortie-cream)]/95 backdrop-blur-sm"
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
      <h1 className="mb-4 font-serif text-3xl text-encre-700">{title}</h1>
      <p className="text-encre-500">
        Cette sortie a été annulée. On se rattrape au prochain&nbsp;?
      </p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-bordeaux-700 underline-offset-4 hover:underline"
      >
        Retour à l&rsquo;accueil
      </Link>
    </main>
  );
}
