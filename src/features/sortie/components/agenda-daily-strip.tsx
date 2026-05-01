import type { DailyStripDay } from "@/features/sortie/lib/agenda-grid";

type Props = {
  days: DailyStripDay[];
};

/**
 * Strip horizontal scrollable des 14 prochains jours. Chaque pill
 * affiche [jour-de-semaine | numéro | dot(s) couleur(s)]. Today est
 * marqué par un anneau acid plus épais. Les transitions de mois
 * remplacent le label jour-de-semaine par le nom du mois (mai → JUIN
 * sur la 1re cellule de juin) plutôt qu'un divider inline qui casserait
 * le scroll snap.
 */
export function AgendaDailyStrip({ days }: Props) {
  return (
    <div className="-mx-1 overflow-x-auto pb-2 scrollbar-none">
      <ul className="flex snap-x snap-mandatory gap-2 px-1">
        {days.map((day) => (
          <li key={day.dayKey} className="shrink-0 snap-start">
            <DayPill day={day} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayPill({ day }: { day: DailyStripDay }) {
  const { fixedCount, voteCount, isToday, monthLabel, weekdayLabel, dayOfMonth } = day;
  const total = fixedCount + voteCount;
  const hasFixed = fixedCount > 0;
  const hasVote = voteCount > 0;

  // Anneau today > mix datée+sondage > datée seule > sondage seul > vide.
  // L'arborescence est ordonnée par priorité visuelle (today domine tout).
  const containerClass = isToday
    ? "bg-acid-500/15 ring-2 ring-acid-500"
    : hasFixed && hasVote
      ? "bg-acid-500/10 ring-1 ring-hot-500/40"
      : hasFixed
        ? "bg-acid-500/10 ring-1 ring-acid-500/30"
        : hasVote
          ? "bg-hot-500/10 ring-1 ring-hot-500/30"
          : "bg-surface-200/60 ring-1 ring-white/5";

  // Substitution : 1er du mois → nom du mois en haut au lieu du jour-de-
  // semaine. Reste compact (3-5 chars), même police mono.
  const topLabel = monthLabel ?? weekdayLabel;
  const topToneClass = monthLabel ? "text-acid-500" : "text-ink-400";

  return (
    <div
      className={`flex h-[78px] w-14 flex-col items-center justify-between rounded-xl px-1.5 py-2 transition-colors duration-motion-standard ${containerClass}`}
      aria-label={
        total > 0
          ? `${day.dayKey} — ${fixedCount} datée${fixedCount > 1 ? "s" : ""}, ${voteCount} sondage${voteCount > 1 ? "s" : ""}`
          : day.dayKey
      }
    >
      <span
        className={`font-mono text-[9px] uppercase leading-none tracking-[0.18em] ${topToneClass}`}
      >
        {topLabel}
      </span>
      <span
        className={`font-display text-[22px] font-black leading-none tabular-nums tracking-tight ${
          isToday || total > 0 ? "text-ink-700" : "text-ink-500"
        }`}
      >
        {dayOfMonth}
      </span>
      <span aria-hidden className="flex h-1.5 items-center gap-1">
        {hasFixed && <span className="h-1.5 w-1.5 rounded-full bg-acid-500" />}
        {hasVote && <span className="h-1.5 w-1.5 rounded-full bg-hot-500" />}
        {total === 0 && <span className="h-1.5 w-1.5 rounded-full bg-transparent" />}
      </span>
    </div>
  );
}
