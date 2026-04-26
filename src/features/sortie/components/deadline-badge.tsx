import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";

type Props = {
  deadlineAt: Date;
};

export function DeadlineBadge({ deadlineAt }: Props) {
  const now = new Date();
  const isPast = deadlineAt < now;
  const hoursLeft = (deadlineAt.getTime() - now.getTime()) / 3_600_000;
  const urgent = !isPast && hoursLeft < 48;
  const criticalSoon = !isPast && hoursLeft < 1;

  if (isPast) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-encre-400">
        ◉ liste close
      </p>
    );
  }

  return (
    <p
      className={
        urgent
          ? "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-or-500"
          : "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-encre-400"
      }
    >
      {urgent && (
        <span
          aria-hidden
          className={
            criticalSoon
              ? "sortie-deadline-halo h-1.5 w-1.5 rounded-full bg-or-500"
              : "h-1.5 w-1.5 animate-pulse rounded-full bg-or-500 shadow-[0_0_10px_var(--sortie-hot)]"
          }
        />
      )}
      <span>réponds avant le {formatOutingDateConversational(deadlineAt)}</span>
    </p>
  );
}
