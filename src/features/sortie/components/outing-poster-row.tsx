import Link from "next/link";
import { OUTING_IMAGE_FILTER } from "@/features/sortie/lib/image-filter";
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
   * Le composant le wrappe en `─ {label} · NN ─` quand `showCount`, sinon
   * juste `─ {label} ─`. */
  eyebrowLabel: string;
  count: number;
  /** Texte du `<ul aria-label>` — décrit la nature du scroll list aux AT. */
  ariaLabel: string;
  items: { outing: PosterOuting; badge: string }[];
  tone?: EyebrowTone;
  /** Pulse acid sur le dot de l'eyebrow. Default true (préserve le rendu
   * existant). Mettre `false` pour les rangées "discovery secondaire" qui
   * ne doivent pas concurrencer le hero pour l'attention. */
  glow?: boolean;
  /** Affiche `· NN` après le label dans l'eyebrow. Default true. Mettre
   * `false` quand le count n'apporte rien (carrousel scrollable où le
   * volume ne guide pas la décision du user). */
  showCount?: boolean;
  /** Format des cards. "poster" = aspect 8/9 (default, signature poster
   * éditoriale). "square" = aspect 1/1, plus compact verticalement, à
   * utiliser pour les rangées de "discovery" qui doivent se distinguer
   * visuellement du hero et des cards à action. */
  aspect?: "poster" | "square";
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
  glow = true,
  showCount = true,
  aspect = "poster",
}: Props) {
  return (
    <section className="mb-7 -mx-6" aria-labelledby={headingId}>
      <Eyebrow id={headingId} tone={tone} glow={glow} className="mb-3 px-6">
        ─ {eyebrowLabel}
        {showCount ? ` · ${String(count).padStart(2, "0")}` : ""} ─
      </Eyebrow>
      <ul
        role="list"
        aria-label={ariaLabel}
        className="flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <li key={item.outing.id} className="shrink-0 snap-start">
            <OutingPosterCard
              outing={item.outing}
              badge={item.badge}
              eager={i === 0}
              aspect={aspect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Card individuelle 144-168px de large, aspect 8/9 (poster) ou 1/1
 * (square, discovery) + titre 2 lignes max + badge texte (date, handle,
 * etc.) en overlay bottom-left. Exporté pour pouvoir être consommé en
 * dehors du shell (rendus ad-hoc, tests).
 */
export function OutingPosterCard({
  outing,
  badge,
  eager = false,
  aspect = "poster",
}: {
  outing: PosterOuting;
  badge: string;
  eager?: boolean;
  aspect?: "poster" | "square";
}) {
  const href = `/${canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId })}`;
  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-[8/9]";

  return (
    <Link
      href={href}
      className="group block w-36 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 sm:w-[168px]"
    >
      <div
        className={`relative ${aspectClass} overflow-hidden rounded-xl bg-surface-100 ring-1 ring-ink-700/5 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5`}
      >
        {outing.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outing.heroImageUrl}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="size-full object-cover object-top"
            style={{ filter: OUTING_IMAGE_FILTER }}
          />
        ) : (
          <OutingPosterFallback title={outing.title} className="size-full" mode="title" varied />
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
