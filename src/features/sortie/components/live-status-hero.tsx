import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { formatOutingDate } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { relativeOutingHero } from "@/features/sortie/lib/relative-date";

type Props = {
  slug: string | null;
  shortId: string;
  title: string;
  location: string | null;
  startsAt: Date;
  confirmed: number;
  /**
   * Total of everyone-not-saying-no — used to add "· N en attente" to the
   * headcount string. Optional: on the public profile view we don't pull
   * that figure and it's fine to show just the confirmed count.
   */
  total?: number;
  heroImageUrl?: string | null;
  /**
   * Eyebrow text above the headline. Defaults to "Ta prochaine sortie"
   * for the logged-in home view. Pass "Prochaine sortie" on a public
   * profile where "ta" is wrong for a stranger's page.
   */
  eyebrow?: string;
  /**
   * HTML heading level for the title. Defaults to `h2` because the
   * public profile already owns the page's `h1` with the user's name.
   * On the logged-in home the hero *is* the top-of-page focus — pass
   * `h1` there so the document has exactly one.
   */
  headingLevel?: "h1" | "h2";
};

/**
 * Featured "what's next" hero on both the logged-in home and the public
 * profile. Title-first anchoring — on a shareable vitrine, a visitor
 * remembers *"Nicolas is going to see Pene Pati"*, not a relative date
 * that rewrites itself every morning. The date is a supporting meta
 * line: relative ("Dans 6 jours") for immediacy + absolute ("Jeudi 30
 * avril · 20h") so the page is stable across bookmarks.
 *
 * Poster sits in a simple `aspect-[3/2] object-cover` block with a
 * light ring + shadow. The earlier blurred-backdrop pattern was
 * producing dead-space halos when the source photo's aspect didn't
 * match the container — dropped.
 */
export function LiveStatusHero({
  slug,
  shortId,
  title,
  location,
  startsAt,
  confirmed,
  total,
  heroImageUrl,
  eyebrow = "Ta prochaine sortie",
  headingLevel = "h2",
}: Props) {
  const canonical = slug ? `${slug}-${shortId}` : shortId;
  const Heading = headingLevel;
  const pending = total !== undefined ? Math.max(0, total - confirmed) : 0;
  const headcount =
    confirmed > 0
      ? `${confirmed} confirmé${confirmed > 1 ? "s" : ""}${pending > 0 ? ` · ${pending} en attente` : ""}`
      : null;

  // First letter of the title, rendered huge on the gradient when we
  // don't have a poster. Gives the empty state a focal point — closer
  // to an Apple Music album placeholder than a dead gradient slab.
  const initial = (title.trim().charAt(0) || "·").toLocaleUpperCase("fr");

  // Returns null past 27 days out so we don't paint a relative phrase
  // that just repeats the absolute date. See `relativeOutingHero`.
  const relative = relativeOutingHero(startsAt);

  return (
    <section className="mb-10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
        {eyebrow}
      </p>
      <Link
        href={`/${canonical}`}
        aria-label={`Voir la sortie ${title}`}
        className="group block rounded-2xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or-500 focus-visible:ring-offset-4 focus-visible:ring-offset-ivoire-50 active:scale-[0.99]"
      >
        <Heading className="font-serif text-4xl leading-[1.02] font-extrabold tracking-tight text-encre-700 group-hover:text-or-600 sm:text-5xl">
          {title}
        </Heading>
        <p className="mt-2 flex items-center gap-1.5 text-base text-encre-500">
          <CalendarDays
            size={15}
            strokeWidth={2}
            aria-hidden="true"
            className="shrink-0 text-encre-400"
          />
          <span>
            {relative && <span className="font-semibold text-encre-700">{relative} · </span>}
            {formatOutingDate(startsAt)}
          </span>
        </p>
        {location && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-encre-500">
            <MapPin
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className="shrink-0 text-encre-400"
            />
            <span>{formatVenue(location)}</span>
          </p>
        )}
        {headcount && <p className="mt-1 text-sm text-encre-500">{headcount}</p>}

        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImageUrl}
            alt=""
            className="mt-5 aspect-[3/2] w-full rounded-2xl bg-ivoire-100 object-cover object-top shadow-[var(--shadow-md)] ring-1 ring-encre-700/5"
          />
        ) : (
          <div
            aria-hidden="true"
            className="relative mt-5 flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFE1D7] via-[#FAF7F2] to-[#D7E0FF] shadow-[var(--shadow-md)] ring-1 ring-encre-700/5"
          >
            {/* Designed empty state, not a broken-image placeholder. The
                earlier 12-14rem letter ate ~60% of the canvas and read as
                "image failed to load"; sized down to 5-6rem with slightly
                higher contrast so it lands closer to an Apple Music album
                monogram — still soft, still secondary, but intentional. */}
            <span className="font-serif text-[5rem] font-black leading-none tracking-tight text-encre-700/30 select-none sm:text-[6rem]">
              {initial}
            </span>
          </div>
        )}
      </Link>
    </section>
  );
}
