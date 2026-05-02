import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { formatOutingDate, formatOutingDayMonthTime } from "@/features/sortie/lib/date-fr";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { OUTING_IMAGE_FILTER } from "@/features/sortie/lib/image-filter";
import { LOCK_GLYPH, resolveLockReason } from "@/features/sortie/lib/lock-reason";
import { relativeOutingHero } from "@/features/sortie/lib/relative-date";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

type Props = {
  slug: string | null;
  shortId: string;
  title: string;
  location: string | null;
  startsAt: Date;
  heroImageUrl?: string | null;
  /**
   * Champs pour résoudre le badge "verrouillé" sur le poster (cf.
   * resolveLockReason). Optionnels — quand absents, pas de badge,
   * legacy-friendly avec les 1-2 sites d'appel pas encore migrés.
   */
  deadlineAt?: Date;
  status?: string;
  mode?: "fixed" | "vote";
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
  /**
   * Variante densifiée pour la home `/` : titre plus petit, poster
   * 16/9 au lieu de 3/2, marge basse réduite. Le profil public garde
   * la version "vitrine" par défaut où le hero est la pièce centrale.
   */
  compact?: boolean;
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
  heroImageUrl,
  deadlineAt,
  status,
  mode,
  eyebrow = "─ ça approche ─",
  headingLevel = "h2",
  compact = false,
}: Props) {
  const canonical = slug ? `${slug}-${shortId}` : shortId;
  const Heading = headingLevel;

  // First letter of the title, rendered huge on the gradient when we
  // don't have a poster. Gives the empty state a focal point — closer
  // to an Apple Music album placeholder than a dead gradient slab.
  const initial = (title.trim().charAt(0) || "·").toLocaleUpperCase("fr");

  // Returns null past 27 days out so we don't paint a relative phrase
  // that just repeats the absolute date. See `relativeOutingHero`.
  const relative = relativeOutingHero(startsAt);

  // Badge "verrouillé" en bottom-right du poster — purchased / vote
  // tranché / deadline passée. Une seule icône à la fois, précédence
  // dans `resolveLockReason`. Skip si les champs status/mode/deadline
  // ne sont pas passés (call site legacy).
  const lockReason =
    deadlineAt && status && mode ? resolveLockReason({ startsAt, deadlineAt, status, mode }) : null;
  const LockGlyph = lockReason ? LOCK_GLYPH[lockReason] : null;

  return (
    // Emphasized fade-up on first mount only. The whole hero is the
    // page's most important moment of arrival; a single, slow entry
    // (400ms) makes the headline feel like it's been waiting for the
    // user rather than snapping into place. `motion-safe:` so reduced-
    // motion users get an instant render.
    <section
      className={`${
        compact ? "mb-6" : "mb-10"
      } motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both duration-motion-emphasized ease-motion-emphasized`}
    >
      <Eyebrow glow className="mb-3">
        {eyebrow}
      </Eyebrow>
      <Link
        href={`/${canonical}`}
        aria-label={`Voir la sortie ${title}`}
        className="group block rounded-2xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600 focus-visible:ring-offset-4 focus-visible:ring-offset-surface-50 motion-safe:active:scale-[0.99]"
      >
        <Heading
          className={`${
            compact
              ? "text-[32px] leading-[0.98] sm:text-[44px]"
              : "text-[44px] leading-[0.95] sm:text-6xl"
          } font-black tracking-[-0.04em] text-ink-700 group-hover:text-acid-600`}
        >
          {title}
          {/* Chevron inline qui suit le titre comme un mot final (pattern
              NYT/Apple News). Sur titre multi-lignes il colle naturellement
              à la fin de la dernière ligne, sans wrapper flex qui casserait
              le wrapping. `align-baseline` fait reposer le SVG sur la
              baseline du texte plutôt que sur sa box, ce qui aligne le
              hampe du chevron avec les capitales du titre. */}
          <ArrowUpRight
            aria-hidden="true"
            strokeWidth={2.4}
            className={`${
              compact ? "ml-1.5 size-6 sm:size-8" : "ml-2 size-8 sm:size-10"
            } inline-block shrink-0 align-baseline text-ink-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-acid-600`}
          />
        </Heading>
        <p className="mt-3 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-500">
          <CalendarDays
            size={14}
            strokeWidth={2.2}
            aria-hidden="true"
            className="shrink-0 text-acid-600"
          />
          <span>
            {relative ? (
              <>
                <span className="text-ink-700">{relative} — </span>
                {formatOutingDayMonthTime(startsAt)}
              </>
            ) : (
              formatOutingDate(startsAt)
            )}
          </span>
        </p>
        {location && (
          <p className="mt-1.5 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-500">
            <MapPin
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
              className="shrink-0 text-acid-600"
            />
            <span>{formatVenue(location)}</span>
          </p>
        )}
        <div className={compact ? "relative mt-4" : "relative mt-5"}>
          {heroImageUrl ? (
            // `data-vt-poster` opts this image into the cross-document
            // View Transitions morph (see sortie.css).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImageUrl}
              alt=""
              data-vt-poster
              className={`${
                compact ? "aspect-[16/9]" : "aspect-[3/2]"
              } w-full rounded-2xl bg-surface-100 object-cover object-top shadow-[var(--shadow-md)] ring-1 ring-ink-700/10`}
              style={{ filter: OUTING_IMAGE_FILTER }}
            />
          ) : (
            <div
              aria-hidden="true"
              className={`relative flex ${
                compact ? "aspect-[16/9]" : "aspect-[3/2]"
              } w-full items-center justify-center overflow-hidden rounded-2xl shadow-[var(--shadow-md)] ring-1 ring-ink-700/10`}
              style={{
                background:
                  "radial-gradient(circle at 25% 20%, rgba(255,61,129,0.55) 0%, transparent 38%), radial-gradient(circle at 80% 80%, rgba(199,255,60,0.55) 0%, transparent 38%), #0f0f0f",
              }}
            >
              <span
                className="font-display text-[6rem] leading-none font-black tracking-tight text-ink-50 opacity-40 select-none sm:text-[7rem]"
                style={{ mixBlendMode: "overlay" }}
              >
                {initial}
              </span>
            </div>
          )}
          {LockGlyph && (
            <span
              aria-hidden="true"
              className="absolute -right-2 -bottom-2 inline-flex size-8 items-center justify-center rounded-full bg-ink-700 text-surface-50 ring-2 ring-surface-50 shadow-[var(--shadow-md)]"
            >
              <LockGlyph size={16} strokeWidth={2.4} />
            </span>
          )}
        </div>
      </Link>
    </section>
  );
}
