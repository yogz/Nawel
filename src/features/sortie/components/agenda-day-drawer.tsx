"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RsvpBadge, TypeBadge, TypeStripe } from "@/features/sortie/components/agenda-timeline";
import type { DayBucket } from "@/features/sortie/lib/agenda-grid";
import { formatTimeOnly } from "@/features/sortie/lib/date-fr";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import type { AgendaItem } from "@/features/sortie/queries/outing-queries";

const TZ = "Europe/Paris";

const dayHeaderFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

type Props = {
  /** dayKey "YYYY-MM-DD" Paris du jour sélectionné, ou null pour fermé. */
  dayKey: string | null;
  /** Bucket du jour (events fixed + slots de sondages). */
  bucket: DayBucket | undefined;
  onClose: () => void;
};

/**
 * Bottom sheet qui s'ouvre au tap sur un jour du calendrier — liste les
 * sorties datées (avec heure exacte) et les sondages dont au moins un
 * créneau tombe ce jour-là (avec les heures candidates ce jour). Tap
 * sur une ligne navigue vers la sortie et ferme le drawer.
 */
export function AgendaDayDrawer({ dayKey, bucket, onClose }: Props) {
  const headerLabel = dayKey
    ? capitalize(dayHeaderFormatter.format(new Date(`${dayKey}T12:00:00+02:00`)))
    : "";

  const groupedVotes = bucket ? groupVoteByItem(bucket.vote) : [];
  const hasContent = bucket && (bucket.fixed.length > 0 || groupedVotes.length > 0);

  return (
    <Sheet open={dayKey !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-0 bg-surface-50 px-6 pb-10 pt-6"
      >
        <SheetHeader className="text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            ─ ce jour-là ─
          </p>
          <SheetTitle className="font-display text-3xl font-black uppercase tracking-tight text-ink-700">
            {headerLabel}
          </SheetTitle>
        </SheetHeader>

        {hasContent ? (
          <ul className="mt-6 space-y-2">
            {bucket.fixed.map((item) => (
              <FixedRow key={item.outingId} item={item} onNavigate={onClose} />
            ))}
            {groupedVotes.map(({ item, slots }) => (
              <VoteRow key={item.outingId} item={item} slots={slots} onNavigate={onClose} />
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
            ─ rien ce jour ─
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FixedRow({ item, onNavigate }: { item: AgendaItem; onNavigate: () => void }) {
  const href = `/${canonicalPathSegment({ slug: item.slug, shortId: item.shortId })}`;
  const schedule = item.fixedDate ? `à ${formatTimeOnly(item.fixedDate)}` : "à programmer";
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="group flex items-stretch gap-3 rounded-xl bg-surface-100 p-3 ring-1 ring-white/5 transition-colors duration-motion-standard hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600"
      >
        <TypeStripe isVote={false} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <TypeBadge isVote={false} />
            <RsvpBadge item={item} />
          </div>
          <h3 className="line-clamp-1 font-display text-[15px] font-bold tracking-tight text-ink-700 transition-colors group-hover:text-acid-600">
            {item.title}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
            {schedule}
          </p>
        </div>
      </Link>
    </li>
  );
}

function VoteRow({
  item,
  slots,
  onNavigate,
}: {
  item: AgendaItem;
  slots: Date[];
  onNavigate: () => void;
}) {
  const href = `/${canonicalPathSegment({ slug: item.slug, shortId: item.shortId })}`;
  const sortedTimes = [...slots]
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => formatTimeOnly(d));
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="group flex items-stretch gap-3 rounded-xl bg-surface-100 p-3 ring-1 ring-white/5 transition-colors duration-motion-standard hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600"
      >
        <TypeStripe isVote={true} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <TypeBadge isVote={true} />
            <RsvpBadge item={item} />
          </div>
          <h3 className="line-clamp-1 font-display text-[15px] font-bold tracking-tight text-ink-700 transition-colors group-hover:text-acid-600">
            {item.title}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
            créneau{sortedTimes.length > 1 ? "x" : ""} · {sortedTimes.join(" · ")}
          </p>
        </div>
      </Link>
    </li>
  );
}

function groupVoteByItem(
  votes: { item: AgendaItem; slotDate: Date }[]
): { item: AgendaItem; slots: Date[] }[] {
  const map = new Map<string, { item: AgendaItem; slots: Date[] }>();
  for (const { item, slotDate } of votes) {
    let entry = map.get(item.outingId);
    if (!entry) {
      entry = { item, slots: [] };
      map.set(item.outingId, entry);
    }
    entry.slots.push(slotDate);
  }
  return Array.from(map.values());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
