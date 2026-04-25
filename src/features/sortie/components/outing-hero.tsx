import { ArrowUpRight, CalendarPlus } from "lucide-react";
import { formatOutingDate } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";

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
        //
        // `data-vt-poster` pairs this image with the same one in
        // LiveStatusHero (home / public profile). Browsers that
        // support View Transitions (Chrome 111+, Safari 18+) will
        // morph between the small card poster and this large hero
        // poster on hard navigations. See sortie.css.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          data-vt-poster
          className="mb-6 aspect-[3/2] w-full rounded-2xl bg-ivoire-100 object-cover object-top shadow-[var(--shadow-md)] ring-1 ring-encre-700/10"
          style={{ filter: "saturate(1.15) contrast(1.05)" }}
        />
      )}

      {startsAt && (
        <p className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          {formatOutingDate(startsAt).toUpperCase()}
        </p>
      )}

      <h1
        className="mt-4 text-[44px] leading-[0.92] font-black tracking-[-0.04em] text-encre-700 sm:text-6xl"
        style={{ textWrap: "balance" }}
      >
        {title}
      </h1>

      {location && (
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em] text-encre-500">
          ◉ {formatVenue(location)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {ticketUrl && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-bordeaux-600 underline-offset-4 hover:underline"
          >
            Prendre mes places
            <ArrowUpRight size={14} strokeWidth={2.4} />
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
            className="inline-flex items-center gap-1 text-encre-500 underline-offset-4 hover:text-bordeaux-600 hover:underline"
          >
            <CalendarPlus size={14} strokeWidth={2.2} />
            Ajouter à mon agenda
          </a>
        )}
      </div>
    </header>
  );
}
