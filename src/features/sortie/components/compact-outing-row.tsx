"use client";

import Link from "next/link";
import {
  RSVP_BADGE_LABEL,
  RSVP_BADGE_TONE_CLASS,
  TypeBadge,
} from "@/features/sortie/components/agenda-timeline";
import { OutingPosterFallback } from "@/features/sortie/components/outing-poster-fallback";
import { formatOutingDateShort } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { LOCK_GLYPH, resolveLockReason } from "@/features/sortie/lib/lock-reason";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import type { ResolvedMyRsvp } from "@/features/sortie/lib/resolve-my-rsvp";
import { getAgendaRsvpBucket } from "@/features/sortie/lib/rsvp-response";

type Outing = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  location: string | null;
  startsAt: Date | null;
  deadlineAt: Date;
  status: string;
  mode: "fixed" | "vote";
  heroImageUrl: string | null;
  creatorUserId: string | null;
  confirmedCount?: number;
};

type Props = {
  outing: Outing;
  resolvedRsvp: ResolvedMyRsvp | null;
  viewerUserId: string;
  isPast?: boolean;
};

/**
 * Card unifiée des sections home (agenda mensuel + passées). Mise en page
 * en 3 lignes texte (badges → titre → date·lieu) héritée du compact agenda,
 * visuel calé sur OutingProfileCard pour rester cohérent avec le reste de
 * la home (image 64px, wrapper surface-50, lock badge, traitement past).
 *
 * Le profil public `/@username` continue d'utiliser `OutingProfileCard` —
 * il a besoin du inline RSVP / vote CTA qui ne tient pas dans ce layout.
 *
 * `data-flash` est togglé 1 s par le parent quand le user tap une cellule
 * du heatmap pointant cet outing.
 */
export function CompactOutingRow({ outing, resolvedRsvp, viewerUserId, isPast = false }: Props) {
  const href = `/${canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId })}`;
  const isVote = outing.mode === "vote";
  const dateLabel = outing.startsAt ? formatOutingDateShort(outing.startsAt) : null;
  const venue = formatVenue(outing.location);

  const rsvpBucket = getAgendaRsvpBucket({
    myResponse: resolvedRsvp?.response ?? null,
    isCreator: outing.creatorUserId === viewerUserId,
  });

  // Badge "verrouillé" en bottom-right du thumb. cf. `resolveLockReason`
  // pour la précédence des 3 états (purchased > vote-tranché > deadline).
  const lockReason = resolveLockReason(outing);
  const LockGlyph = lockReason ? LOCK_GLYPH[lockReason] : null;

  // Sortie passée : on dégrade visuellement pour qu'elle se lise comme
  // un souvenir et non comme une action en attente. Aligné sur le
  // traitement OutingProfileCard pour cohérence cross-card.
  const pastWrapperClasses = isPast
    ? "opacity-80 transition-opacity duration-300 hover:opacity-100"
    : "";
  const pastImageClasses = isPast
    ? "grayscale opacity-80 transition-[filter,opacity] duration-300 group-hover:grayscale-0 group-hover:opacity-100"
    : "";
  const pastTitleClasses = isPast ? "text-ink-500" : "text-ink-700";
  const pastMetaClasses = isPast ? "text-ink-400" : "text-ink-400";

  const metaLine = [
    dateLabel,
    venue,
    isPast && outing.confirmedCount && outing.confirmedCount > 0
      ? `${outing.confirmedCount} confirmé${outing.confirmedCount > 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={href}
      className={`group flex items-stretch gap-3 rounded-xl bg-surface-50 p-3 ring-1 ring-ink-700/5 transition-colors duration-motion-standard hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500 group-data-[flash=true]/flash:bg-acid-500/15 group-data-[flash=true]/flash:ring-acid-500/40 ${pastWrapperClasses}`}
    >
      <div className="relative size-16 shrink-0">
        {outing.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outing.heroImageUrl}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            className={`size-16 rounded-md bg-surface-100 object-cover object-top ${pastImageClasses}`}
            style={isPast ? undefined : { filter: "saturate(1.15) contrast(1.05)" }}
          />
        ) : (
          <OutingPosterFallback
            title={outing.title}
            className={`size-16 rounded-md ${pastImageClasses}`}
            textClassName="text-2xl opacity-50"
          />
        )}
        {LockGlyph && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -bottom-1 inline-flex size-[18px] items-center justify-center rounded-full bg-ink-700 text-surface-50 ring-1 ring-surface-50"
          >
            <LockGlyph size={10} strokeWidth={2.4} />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <TypeBadge isVote={isVote} />
          <span
            className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${RSVP_BADGE_TONE_CLASS[rsvpBucket]}`}
          >
            {RSVP_BADGE_LABEL[rsvpBucket]}
          </span>
        </div>
        <h3
          className={`line-clamp-1 font-display text-[17px] leading-tight font-black tracking-[-0.025em] transition-colors group-hover:text-acid-600 ${pastTitleClasses}`}
        >
          {outing.title}
        </h3>
        {metaLine && (
          <p
            className={`line-clamp-1 font-mono text-[10.5px] uppercase tracking-[0.12em] ${pastMetaClasses}`}
          >
            {metaLine}
          </p>
        )}
      </div>
    </Link>
  );
}
