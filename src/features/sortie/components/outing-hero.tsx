import { formatOutingDate } from "@/features/sortie/lib/date-fr";

type Props = {
  title: string;
  location: string | null;
  startsAt: Date | null;
  ticketUrl: string | null;
  heroImageUrl?: string | null;
};

export function OutingHero({ title, location, startsAt, ticketUrl, heroImageUrl }: Props) {
  return (
    <header className="flex flex-col items-start text-left">
      {heroImageUrl && (
        // Remote ticket-site CDNs — whitelisting each domain for next/image
        // would create a perpetual maintenance task, and these images are
        // already cached on their original CDNs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          className="mb-6 aspect-[16/10] w-full rounded-2xl bg-ivoire-100 object-cover shadow-[var(--shadow-md)]"
        />
      )}

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
