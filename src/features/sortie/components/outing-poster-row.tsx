import Link from "next/link";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { Eyebrow } from "./eyebrow";
import { OutingPosterFallback } from "./outing-poster-fallback";

type Outing = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  heroImageUrl: string | null;
};

type Item = {
  outing: Outing;
  /**
   * Badge en overlay bas-gauche du poster. La sémantique est laissée
   * au wrapper (recency `il y a 2j` vs handle créateur `@bob`) — le
   * shell se contente de l'afficher avec un fond sombre lisible.
   */
  badge: string;
};

type Props = {
  /** Identifiant DOM pour l'`aria-labelledby` de la liste — chaque
   * occurrence du shell sur une même page doit avoir un id distinct. */
  headingId: string;
  /** Texte visible de l'eyebrow ("derniers ajoutés", "tes suivis"…). */
  eyebrowLabel: string;
  /** Nombre affiché en bout d'eyebrow (zéro-paddé). */
  count: number;
  /** Annonce SR pour la row (instructions de scroll). */
  ariaLabel: string;
  items: Item[];
};

/**
 * Bandeau scroll-snap horizontal de cards "poster + titre". Shell
 * commun à `RecentlyAddedRow` (recency badge) et `FollowedOutingsRow`
 * (handle créateur badge). Cf. recently-added-row.tsx pour l'historique
 * des choix non-évidents (snap-proximity, role="list").
 */
export function OutingPosterRow({ headingId, eyebrowLabel, count, ariaLabel, items }: Props) {
  return (
    <section className="mb-7 -mx-6" aria-labelledby={headingId}>
      <Eyebrow id={headingId} tone="acid" glow className="mb-3 px-6">
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

export function OutingPosterCard({
  outing,
  badge,
  eager,
}: {
  outing: Outing;
  badge: string;
  eager: boolean;
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
            // En mode lien privé la rangée est tout en haut de page (pas
            // de hero) — la 1ère card peut être le LCP. Reste lazy pour
            // les suivantes (off-screen sur mobile).
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
        <span className="absolute bottom-2 left-2 inline-flex items-center rounded-sm bg-ink-700/60 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-surface-50 backdrop-blur-sm">
          {badge}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 font-display text-[13px] leading-tight font-black tracking-[-0.025em] text-ink-700 transition-colors group-hover:text-acid-600">
        {outing.title}
      </h3>
    </Link>
  );
}
