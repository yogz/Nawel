import { formatOutingDateConversational } from "@/features/sortie/lib/date-fr";

type Props = {
  deadlineAt: Date;
};

export function DeadlineBadge({ deadlineAt }: Props) {
  const now = new Date();
  const isPast = deadlineAt < now;
  const hoursLeft = (deadlineAt.getTime() - now.getTime()) / 3_600_000;
  const urgent = !isPast && hoursLeft < 48;

  if (isPast) {
    return <p className="text-sm text-encre-400">La liste est close.</p>;
  }

  return (
    <p className={urgent ? "text-sm font-medium text-bordeaux-700" : "text-sm text-encre-400"}>
      {urgent ? "⏳ " : ""}Réponse avant {formatOutingDateConversational(deadlineAt)}.
    </p>
  );
}
