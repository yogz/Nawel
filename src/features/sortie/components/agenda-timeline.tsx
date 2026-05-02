import Link from "next/link";
import { formatOutingDateShort, formatVotedSlotsCompact } from "@/features/sortie/lib/date-fr";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { getAgendaRsvpBucket, type AgendaRsvpBucket } from "@/features/sortie/lib/rsvp-response";
import type { AgendaItem } from "@/features/sortie/queries/outing-queries";

type Props = {
  items: AgendaItem[];
  now: Date;
};

/**
 * Liste chrono sous le heatmap. Les sorties datées remontent par
 * `fixedDate`, les sondages par leur 1er candidat dans la fenêtre — un
 * sondage avec un candidat le 5 mai apparaît au même rang qu'une sortie
 * datée du 5 mai, ce qui aligne visuellement timeline et heatmap.
 */
export function AgendaTimeline({ items, now }: Props) {
  const sorted = sortItemsChronologically(items);

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl bg-surface-100 px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
        ─ rien sur les 3 prochains mois ─
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((item) => (
        <li key={item.outingId}>
          <TimelineRow item={item} now={now} />
        </li>
      ))}
    </ul>
  );
}

function TimelineRow({ item, now }: { item: AgendaItem; now: Date }) {
  const href = `/${canonicalPathSegment({ slug: item.slug, shortId: item.shortId })}`;
  const isVote = item.mode === "vote";

  return (
    <Link
      href={href}
      className="group flex items-stretch gap-3 rounded-xl bg-surface-100 p-3 ring-1 ring-white/5 transition-colors duration-motion-standard hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600"
    >
      <TypeStripe isVote={isVote} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <TypeBadge isVote={isVote} />
          <RsvpBadge item={item} />
        </div>
        <h3 className="line-clamp-1 font-display text-[15px] font-bold tracking-tight text-ink-700 transition-colors group-hover:text-acid-600">
          {item.title}
        </h3>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
          {formatItemSchedule(item, now)}
        </p>
      </div>
    </Link>
  );
}

export function TypeStripe({ isVote }: { isVote: boolean }) {
  return (
    <div
      aria-hidden
      className={`w-1 shrink-0 rounded-full ${isVote ? "bg-hot-500/70" : "bg-acid-500/70"}`}
    />
  );
}

export function TypeBadge({ isVote }: { isVote: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
        isVote ? "bg-hot-500/15 text-hot-500" : "bg-acid-500/15 text-acid-500"
      }`}
    >
      {isVote ? "sondage" : "datée"}
    </span>
  );
}

export const RSVP_BADGE_LABEL: Record<AgendaRsvpBucket, string> = {
  yes: "tu y vas",
  maybe: "intéressé",
  no: "non",
  creator: "tu organises",
  pending: "à répondre",
};

export const RSVP_BADGE_TONE_CLASS: Record<AgendaRsvpBucket, string> = {
  yes: "bg-acid-500/15 text-acid-500",
  maybe: "bg-hot-500/15 text-hot-500",
  no: "bg-surface-300 text-ink-400",
  creator: "bg-ink-700/15 text-ink-600",
  pending: "bg-surface-300 text-ink-500",
};

export function RsvpBadge({ item }: { item: AgendaItem }) {
  const bucket = getAgendaRsvpBucket(item);
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${RSVP_BADGE_TONE_CLASS[bucket]}`}
    >
      {RSVP_BADGE_LABEL[bucket]}
    </span>
  );
}

function formatItemSchedule(item: AgendaItem, now: Date): string {
  if (item.mode === "fixed" && item.fixedDate) {
    return formatOutingDateShort(item.fixedDate, now);
  }
  if (item.candidateDates.length > 0) {
    return formatVotedSlotsCompact(item.candidateDates);
  }
  return "à programmer";
}

/**
 * Tri par premier événement chronologique : `fixedDate` pour les datées,
 * `candidateDates[0]` (déjà ASC depuis la query) pour les sondages.
 * Items sans date connue (cas dégénéré : sondage sans candidat dans la
 * fenêtre) finissent en queue.
 */
function sortItemsChronologically(items: AgendaItem[]): AgendaItem[] {
  return [...items].sort((a, b) => {
    const ta = primaryDate(a);
    const tb = primaryDate(b);
    if (ta === null && tb === null) {
      return 0;
    }
    if (ta === null) {
      return 1;
    }
    if (tb === null) {
      return -1;
    }
    return ta - tb;
  });
}

function primaryDate(item: AgendaItem): number | null {
  if (item.mode === "fixed" && item.fixedDate) {
    return item.fixedDate.getTime();
  }
  if (item.candidateDates.length > 0) {
    return item.candidateDates[0].getTime();
  }
  return null;
}
