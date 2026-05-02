import Link from "next/link";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { Eyebrow, type EyebrowTone } from "./eyebrow";
import { OutingPosterFallback } from "./outing-poster-fallback";

export type PosterOuting = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  heroImageUrl: string | null;
};

type Props = {
  /** Id du `<Eyebrow>` — référencé par `aria-labelledby` sur le <ul>. */
  headingId: string;
  /** Texte central du eyebrow ("derniers ajoutés", "des suivis suivent"…).
   * Le composant le wrappe en `─ {label} · NN ─`. */
  eyebrowLabel: string;
  count: number;
  /** Texte du `<ul aria-label>` — décrit la nature du scroll list aux AT. */
  ariaLabel: string;
  items: { outing: PosterOuting; badge: string }[];
  tone?: EyebrowTone;
};

/**
 * Shell partagé pour toutes les rangées de cards "poster" sur la home /
 * profile. Centralise scroll-snap, mask gradient à droite, role="list",
 * et délègue le rendu individuel à `<OutingPosterCard>`.
 *
 * Choix non-évidents (hérités de RecentlyAddedRow) :
 *  - `snap-proximity` (pas mandatory) : iOS Safari, mandatory + swipe
 *    diagonal kidnappe le scroll vertical (interaction principale d'une
 *    page mobile-first).
 *  - `role="list"`, pas `aria-roledescription="carousel"` : ce n'est pas
 *    un carousel à 1 slide focus, c'est une row d'items à parcourir
 *    (pattern Spotify / App Store).
 */
export function OutingPosterRow({
  headingId,
  eyebrowLabel,
  count,
  ariaLabel,
  items,
  tone = "acid",
}: Props) {
  return (
    <section className="mb-7 -mx-6" aria-labelledby={headingId}>
      <Eyebrow id={headingId} tone={tone} glow className="mb-3 px-6">
        ─ {eyebrowLabel} · {String(count).padStart(2, "0")} ─
      </Eyebrow>
      <ul
        role="list"
        aria-label={ariaLabel}
        className="flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <li key={item.outing.id} className="shrink-0 snap-start">
            <OutingPosterCard outing={item.outing} badge={item.badge} eager={i === 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Card individuelle 144-168px de large, aspect 8/9 pour le poster +
 * titre 2 lignes max + badge texte (date, handle, etc.) en overlay
 * bottom-left. Exporté pour pouvoir être consommé en dehors du shell
 * (rendus ad-hoc, tests).
 */
export function OutingPosterCard({
  outing,
  badge,
  eager = false,
}: {
  outing: PosterOuting;
  badge: string;
  eager?: boolean;
}) {
  const href = `/${canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId })}`;

  return (
    <Link
      href={href}
      className="group block w-36 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 sm:w-[168px]"
    >
      <div className="relative aspect-[8/9] overflow-hidden rounded-xl bg-surface-100 ring-1 ring-ink-700/5 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5">
        {outing.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outing.heroImageUrl}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="size-full object-cover object-top"
            // Saturate/contrast aligné sur OutingProfileCard et LiveStatusHero
            // pour cohérence cross-surface malgré les sources hétérogènes
            // (Ticketmaster, Fnac, AllOcc, uploads users).
            style={{ filter: "saturate(1.15) contrast(1.05)" }}
          />
        ) : (
          <OutingPosterFallback
            title={outing.title}
            className="size-full"
            textClassName="text-5xl opacity-50"
            varied
          />
        )}
        <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center truncate rounded-sm bg-ink-700/60 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-surface-50 backdrop-blur-sm">
          {badge}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 font-display text-[13px] leading-tight font-black tracking-[-0.025em] text-ink-700 transition-colors group-hover:text-acid-600">
        {outing.title}
      </h3>
    </Link>
  );
}
