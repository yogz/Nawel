import { ArrowUpRight, CalendarPlus } from "lucide-react";
import { formatOutingDate } from "@/features/sortie/lib/date-fr";

type Props = {
  title: string;
  location: string | null;
  startsAt: Date | null;
  ticketUrl: string | null;
  heroImageUrl?: string | null;
  /** Canonical `slug-shortId` path of the outing — used to link to the
   * iCalendar download (`/<canonicalPath>/agenda`). Optional so vote-
   * mode pages (no fixed date) can render the hero without the
   * "Ajouter à mon agenda" affordance. */
  canonicalPath?: string;
};

export function OutingHero({
  title,
  location,
  startsAt,
  ticketUrl,
  heroImageUrl,
  canonicalPath,
}: Props) {
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
          className="mb-6 aspect-[3/2] w-full rounded-2xl bg-ivoire-100 object-cover object-top shadow-[var(--shadow-md)] ring-1 ring-encre-700/5"
        />
      )}

      {startsAt && (
        <p className="inline-flex items-center rounded-full bg-bordeaux-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-bordeaux-700">
          {formatOutingDate(startsAt)}
        </p>
      )}

      <h1 className="mt-4 text-[44px] leading-[0.95] font-black tracking-[-0.035em] text-encre-700 sm:text-6xl">
        {title}
      </h1>

      {location && <p className="mt-4 text-lg text-encre-400">{location}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {ticketUrl && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-bordeaux-600 underline-offset-4 hover:underline"
          >
            Prendre mes places
            <ArrowUpRight size={14} strokeWidth={2.2} />
          </a>
        )}
        {startsAt && canonicalPath && (
          <a
            href={`/${canonicalPath}/agenda`}
            // `download` is a hint to the browser — iOS / Android treat
            // the `text/calendar` MIME as "add to calendar" regardless,
            // but the filename makes the fallback download readable on
            // desktop.
            download={`sortie-${canonicalPath}.ics`}
            className="inline-flex items-center gap-1 text-bordeaux-600 underline-offset-4 hover:underline"
          >
            <CalendarPlus size={14} strokeWidth={2.2} />
            Ajouter à mon agenda
          </a>
        )}
      </div>
    </header>
  );
}
