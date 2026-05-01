import type { DayBucket, DayCell, MonthGrid } from "@/features/sortie/lib/agenda-grid";

type Props = {
  months: MonthGrid[];
  buckets: Map<string, DayBucket>;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function AgendaHeatmap({ months, buckets }: Props) {
  return (
    <div className="space-y-8">
      {months.map((month) => (
        <MonthCard key={month.label} month={month} buckets={buckets} />
      ))}
    </div>
  );
}

function MonthCard({ month, buckets }: { month: MonthGrid; buckets: Map<string, DayBucket> }) {
  return (
    <section className="rounded-2xl bg-surface-100 p-4 ring-1 ring-white/5">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight text-ink-700">
          {month.label}
        </h2>
        {month.itemCount > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
            {month.itemCount} {month.itemCount > 1 ? "items" : "item"}
          </span>
        )}
      </header>

      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {month.weeks
          .flat()
          .map((cell, i) =>
            cell ? (
              <DayCellView key={cell.dayKey} cell={cell} bucket={buckets.get(cell.dayKey)} />
            ) : (
              <div key={`empty-${i}`} aria-hidden className="aspect-square" />
            )
          )}
      </div>
    </section>
  );
}

function DayCellView({ cell, bucket }: { cell: DayCell; bucket: DayBucket | undefined }) {
  const fixedCount = bucket?.fixed.length ?? 0;
  const voteCount = bucket?.vote.length ?? 0;
  const total = fixedCount + voteCount;

  const isOut = cell.outOfWindow;
  const hasFixed = fixedCount > 0;
  const hasVote = voteCount > 0;

  // Intensité 1/2/3 → opacités progressives sur la couleur de base.
  const intensity = total === 0 ? 0 : total === 1 ? 1 : total === 2 ? 2 : 3;

  // Choix de la couleur de fond :
  //   vide → surface-200 (placeholder très discret)
  //   datée seule → acid (vert)
  //   sondage seul → hot (rose)
  //   mix → acid en fond + ring hot pour signaler le sondage
  const bgClass = hasFixed
    ? intensity === 1
      ? "bg-acid-300/25"
      : intensity === 2
        ? "bg-acid-400/45"
        : "bg-acid-500/65"
    : hasVote
      ? intensity === 1
        ? "bg-hot-400/25"
        : intensity === 2
          ? "bg-hot-500/45"
          : "bg-hot-500/65"
      : "bg-surface-200/60";

  const ringClass = hasFixed && hasVote ? "ring-1 ring-hot-500/70" : "";
  const todayRing = cell.isToday ? "ring-1 ring-acid-500" : "";
  const dimmed = isOut ? "opacity-30" : "";

  return (
    <div
      className={`relative aspect-square rounded-md ${bgClass} ${ringClass} ${todayRing} ${dimmed} transition-colors duration-motion-standard`}
      aria-label={
        total > 0
          ? `${cell.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
          : cell.dayKey
      }
    >
      <span
        className={`absolute left-1 top-0.5 font-mono text-[10px] leading-none ${
          total > 0 ? "text-ink-800" : "text-ink-400"
        }`}
      >
        {cell.dayOfMonth}
      </span>
    </div>
  );
}
