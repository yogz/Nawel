"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AgendaDayDrawer } from "@/features/sortie/components/agenda-day-drawer";
import {
  bucketAgendaByDay,
  buildMonthGrid,
  type DayBucket,
  type DayCell,
} from "@/features/sortie/lib/agenda-grid";
import type { AgendaItem } from "@/features/sortie/queries/outing-queries";

type Props = {
  items: AgendaItem[];
  /** ISO du `now` snapshoté côté serveur — alignement même J/J+1. */
  nowIso: string;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * Aperçu calendrier mois courant — variante allégée d'`AgendaMonthView`
 * pour la home : pas de nav (flèches/swipe), pas de filtres, le but est
 * un coup d'œil avant de rebondir sur `/agenda` pour l'exploration. Tap
 * sur un jour avec events ouvre le même drawer que sur `/agenda`.
 */
export function MiniMonthCalendar({ items, nowIso }: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const buckets = useMemo(() => bucketAgendaByDay(items), [items]);
  const month = useMemo(() => buildMonthGrid(now, buckets, 0), [now, buckets]);

  return (
    <section className="rounded-2xl bg-surface-100 p-5 ring-1 ring-white/5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            ─ ce mois-ci ─
          </p>
          <h3 className="mt-1 font-display text-[20px] font-black uppercase leading-none tracking-tight text-ink-700">
            {capitalize(monthFormatter.format(now))}
          </h3>
        </div>
        <Link
          href="/agenda"
          className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-500 underline-offset-4 transition-colors hover:text-acid-600 hover:underline"
        >
          agenda
          <ArrowUpRight size={12} strokeWidth={2.4} />
        </Link>
      </header>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {month.weeks
          .flat()
          .map((cell, i) =>
            cell ? (
              <MiniDayCell
                key={cell.dayKey}
                cell={cell}
                bucket={buckets.get(cell.dayKey)}
                onSelect={setSelectedDayKey}
              />
            ) : (
              <div key={`empty-${i}`} aria-hidden className="aspect-square" />
            )
          )}
      </div>

      <AgendaDayDrawer
        dayKey={selectedDayKey}
        bucket={selectedDayKey ? buckets.get(selectedDayKey) : undefined}
        onClose={() => setSelectedDayKey(null)}
      />
    </section>
  );
}

function MiniDayCell({
  cell,
  bucket,
  onSelect,
}: {
  cell: DayCell;
  bucket: DayBucket | undefined;
  onSelect: (dayKey: string) => void;
}) {
  const fixedCount = bucket?.fixed.length ?? 0;
  const voteCount = bucket?.vote.length ?? 0;
  const total = fixedCount + voteCount;

  const hasFixed = fixedCount > 0;
  const hasVote = voteCount > 0;
  const interactive = total > 0;

  // Cap à 2+2 dots dans la mini : la cellule est ~10% plus petite que
  // sur /agenda, au-delà de 4 le rendu devient bruité. Overflow → "+N".
  const fixedDotsShown = Math.min(fixedCount, 2);
  const voteDotsShown = Math.min(voteCount, 2);
  const overflow = total - (fixedDotsShown + voteDotsShown);

  const bgClass =
    hasFixed && hasVote
      ? "bg-acid-500/10 ring-1 ring-hot-500/40"
      : hasFixed
        ? "bg-acid-500/10 ring-1 ring-acid-500/25"
        : hasVote
          ? "bg-hot-500/10 ring-1 ring-hot-500/25"
          : "bg-surface-200/40";

  const todayRing = cell.isToday ? "ring-2 ring-acid-500" : "";
  const interactiveClass = interactive
    ? "cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-500"
    : "cursor-default";

  const className = `flex aspect-square flex-col rounded-md p-1 text-left ${bgClass} ${todayRing} ${interactiveClass} transition-all duration-motion-standard`;
  const ariaLabel =
    total > 0
      ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
      : cell.dayKey;

  const content = (
    <>
      <span
        className={`font-mono text-[10px] leading-none tabular-nums ${
          total > 0 || cell.isToday ? "font-bold text-ink-700" : "text-ink-500"
        }`}
      >
        {cell.dayOfMonth}
      </span>
      {total > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-0.5">
          {Array.from({ length: fixedDotsShown }).map((_, i) => (
            <span key={`f-${i}`} className="h-1 w-1 rounded-full bg-acid-500" />
          ))}
          {Array.from({ length: voteDotsShown }).map((_, i) => (
            <span key={`v-${i}`} className="h-1 w-1 rounded-full bg-hot-500" />
          ))}
          {overflow > 0 && (
            <span className="ml-0.5 font-mono text-[8px] leading-none tabular-nums text-ink-500">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </>
  );

  if (!interactive) {
    return (
      <div className={className} aria-label={ariaLabel}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dayKey)}
      className={className}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
