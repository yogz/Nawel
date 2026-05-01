import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";

type Props = {
  deadlineAt: Date;
};

/**
 * Complément "(dans X jours)" / "(plus que Xh)" / "(plus que X min)"
 * collé à la deadline absolue. Sans le countdown, l'invité doit
 * faire la soustraction mentale ; avec, le sentiment d'urgence est
 * lisible d'un regard. On bascule la formulation à <48h ("plus que")
 * pour insister sur le compte à rebours, alors que >48h reste neutre
 * ("dans").
 */
function formatCountdown(msLeft: number): string {
  const minutesLeft = Math.max(0, Math.floor(msLeft / 60_000));
  const hoursLeft = Math.floor(minutesLeft / 60);
  const daysLeft = Math.floor(hoursLeft / 24);

  if (hoursLeft < 1) {
    return minutesLeft <= 1 ? "plus qu'une minute" : `plus que ${minutesLeft} min`;
  }
  if (hoursLeft < 48) {
    return hoursLeft === 1 ? "plus qu'une heure" : `plus que ${hoursLeft}h`;
  }
  return daysLeft === 1 ? "dans 1 jour" : `dans ${daysLeft} jours`;
}

export function DeadlineBadge({ deadlineAt }: Props) {
  const now = new Date();
  const msLeft = deadlineAt.getTime() - now.getTime();
  const isPast = msLeft < 0;
  const hoursLeft = msLeft / 3_600_000;
  const urgent = !isPast && hoursLeft < 48;
  const criticalSoon = !isPast && hoursLeft < 1;

  if (isPast) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
        ◉ liste close
      </p>
    );
  }

  const countdown = formatCountdown(msLeft);

  return (
    <p
      className={
        urgent
          ? "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-hot-500"
          : "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400"
      }
    >
      {urgent && (
        <span
          aria-hidden
          className={
            criticalSoon
              ? "sortie-deadline-halo h-1.5 w-1.5 rounded-full bg-hot-500"
              : "h-1.5 w-1.5 animate-pulse rounded-full bg-hot-500 shadow-[0_0_10px_var(--sortie-hot)]"
          }
        />
      )}
      <span>
        réponds avant le {formatOutingDateConversational(deadlineAt)}{" "}
        <span className={urgent ? "text-hot-400" : "text-ink-300"}>({countdown})</span>
      </span>
    </p>
  );
}
