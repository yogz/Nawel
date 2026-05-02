"use client";

import Link from "next/link";
import { OutingPosterFallback } from "@/features/sortie/components/outing-poster-fallback";
import { formatOutingDateShort } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import type { ResolvedMyRsvp } from "@/features/sortie/lib/resolve-my-rsvp";
import { type AgendaRsvpBucket, getAgendaRsvpBucket } from "@/features/sortie/lib/rsvp-response";

type Outing = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
  mode: "fixed" | "vote";
  heroImageUrl: string | null;
  creatorUserId: string | null;
};

type Props = {
  outing: Outing;
  resolvedRsvp: ResolvedMyRsvp | null;
  viewerUserId: string;
};

const RSVP_LABEL: Record<AgendaRsvpBucket, string> = {
  yes: "tu y vas",
  maybe: "intéressé",
  no: "non",
  creator: "tu organises",
  pending: "à répondre",
};

const RSVP_TONE: Record<AgendaRsvpBucket, string> = {
  yes: "bg-acid-500/15 text-acid-500",
  maybe: "bg-hot-500/15 text-hot-500",
  no: "bg-surface-300 text-ink-400",
  creator: "bg-ink-700/15 text-ink-600",
  pending: "bg-surface-300 text-ink-500",
};

/**
 * Row condensée affichée dans le bloc agenda de la home, sous la
 * mini-grille `AgendaMonthHeatmap`. Substitut compact d'`OutingProfileCard`
 * pour la liste mensuelle : on troque les CTAs RSVP/vote inline contre
 * un simple badge état + navigation au tap. L'invité retrouve l'inline
 * RSVP en ouvrant la sortie.
 *
 * `data-flash` est togglé 1 s par le parent quand le user tap une cellule
 * du heatmap pointant cet outing (cf. `home-month-agenda.tsx`).
 */
export function CompactOutingRow({ outing, resolvedRsvp, viewerUserId }: Props) {
  const href = `/${canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId })}`;
  const isVote = outing.mode === "vote";
  const dateLabel = outing.startsAt ? formatOutingDateShort(outing.startsAt) : null;
  const venue = formatVenue(outing.location);

  const rsvpBucket = getAgendaRsvpBucket({
    myResponse: resolvedRsvp?.response ?? null,
    isCreator: outing.creatorUserId === viewerUserId,
  });

  return (
    <Link
      href={href}
      className="group flex items-stretch gap-3 rounded-xl bg-surface-100 p-2.5 ring-1 ring-white/5 transition-colors duration-motion-standard hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500 group-data-[flash=true]/flash:bg-acid-500/15 group-data-[flash=true]/flash:ring-acid-500/40"
    >
      <div className="relative size-12 shrink-0">
        {outing.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outing.heroImageUrl}
            alt=""
            className="size-12 rounded-lg bg-surface-200 object-cover object-top"
            style={{ filter: "saturate(1.15) contrast(1.05)" }}
          />
        ) : (
          <OutingPosterFallback
            title={outing.title}
            className="size-12 rounded-lg"
            textClassName="text-lg opacity-50"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
              isVote ? "bg-hot-500/15 text-hot-500" : "bg-acid-500/15 text-acid-500"
            }`}
          >
            {isVote ? "sondage" : "datée"}
          </span>
          <span
            className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${RSVP_TONE[rsvpBucket]}`}
          >
            {RSVP_LABEL[rsvpBucket]}
          </span>
        </div>
        <h3 className="line-clamp-1 font-display text-[14px] font-bold leading-snug tracking-tight text-ink-700 transition-colors group-hover:text-acid-600">
          {outing.title}
        </h3>
        {(dateLabel || venue) && (
          <p className="line-clamp-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">
            {[dateLabel, venue].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
