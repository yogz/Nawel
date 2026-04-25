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
    // Emphasized fade-up on first mount only. The whole hero is the
    // page's most important moment of arrival; a single, slow entry
    // (400ms) makes the headline feel like it's been waiting for the
    // user rather than snapping into place. `motion-safe:` so reduced-
    // motion users get an instant render.
    <section className="mb-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both duration-motion-emphasized ease-motion-emphasized">
      <p className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-bordeaux-600 shadow-[0_0_12px_var(--sortie-acid)]"
        />
        {eyebrow}
      </p>
      <Link
        href={`/${canonical}`}
        aria-label={`Voir la sortie ${title}`}
        className="group block rounded-2xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux-600 focus-visible:ring-offset-4 focus-visible:ring-offset-ivoire-50 motion-safe:active:scale-[0.99]"
      >
        <Heading className="text-[44px] leading-[0.95] font-black tracking-[-0.04em] text-encre-700 group-hover:text-bordeaux-600 sm:text-6xl">
          {title}
        </Heading>
        <p className="mt-3 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-encre-500">
          <CalendarDays
            size={14}
            strokeWidth={2.2}
            aria-hidden="true"
            className="shrink-0 text-bordeaux-600"
          />
          <span>
            {relative && <span className="text-encre-700">{relative} — </span>}
            {formatOutingDate(startsAt)}
          </span>
        </p>
        {location && (
          <p className="mt-1.5 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-encre-500">
            <MapPin
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
              className="shrink-0 text-bordeaux-600"
            />
            <span>{formatVenue(location)}</span>
          </p>
        )}
        {headcount && (
          <p className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-encre-500">
            ◉ {headcount}
          </p>
        )}

        {heroImageUrl ? (
          // `data-vt-poster` opts this image into the cross-document
          // View Transitions morph (see sortie.css).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImageUrl}
            alt=""
            data-vt-poster
            className="mt-5 aspect-[3/2] w-full rounded-2xl bg-ivoire-100 object-cover object-top shadow-[var(--shadow-md)] ring-1 ring-encre-700/10"
            style={{ filter: "saturate(1.15) contrast(1.05)" }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="relative mt-5 flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-2xl shadow-[var(--shadow-md)] ring-1 ring-encre-700/10"
            style={{
              background:
                "radial-gradient(circle at 25% 20%, #FF3D81 0%, transparent 45%), radial-gradient(circle at 80% 80%, #C7FF3C 0%, transparent 45%), #1a1a1a",
            }}
          >
            <span
              className="text-[6rem] leading-none font-black tracking-tight text-encre-50 opacity-40 select-none sm:text-[7rem]"
              style={{
                fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
                mixBlendMode: "overlay",
              }}
            >
              {initial}
            </span>
          </div>
        )}
      </Link>
    </section>
  );
}
