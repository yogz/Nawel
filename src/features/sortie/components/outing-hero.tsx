import { formatOutingDate } from "@/features/sortie/lib/date-fr";

type Props = {
  title: string;
  location: string | null;
  startsAt: Date | null;
  ticketUrl: string | null;
};

export function OutingHero({ title, location, startsAt, ticketUrl }: Props) {
  return (
    <header className="flex flex-col items-center text-center">
      <div className="sortie-filet mt-8">
        <span className="sortie-filet-diamond" />
      </div>

      <h1 className="mt-6 font-serif text-4xl leading-[1.05] text-encre-700 sm:text-5xl">
        {title}
      </h1>

      {location && <p className="mt-3 font-serif text-lg italic text-encre-500">{location}</p>}

      {startsAt && (
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
          {formatOutingDate(startsAt)}
        </p>
      )}

      {ticketUrl && (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-sm text-encre-400 underline-offset-4 hover:text-bordeaux-700 hover:underline"
        >
          Voir la billetterie ↗
        </a>
      )}
    </header>
  );
}
