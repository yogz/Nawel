import { formatOutingDate } from "@/features/sortie/lib/date-fr";

type Props = {
  title: string;
  location: string | null;
  startsAt: Date | null;
  ticketUrl: string | null;
};

export function OutingHero({ title, location, startsAt, ticketUrl }: Props) {
  return (
    <header className="flex flex-col items-start text-left">
      {startsAt && (
        <p className="inline-flex items-center rounded-full bg-bordeaux-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-bordeaux-700">
          {formatOutingDate(startsAt)}
        </p>
      )}

      <h1 className="mt-4 text-4xl leading-[1.03] text-encre-700 sm:text-5xl">{title}</h1>

      {location && <p className="mt-3 text-lg text-encre-400">{location}</p>}

      {ticketUrl && (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-sm text-bordeaux-600 underline-offset-4 hover:underline"
        >
          Voir la billetterie ↗
        </a>
      )}
    </header>
  );
}
