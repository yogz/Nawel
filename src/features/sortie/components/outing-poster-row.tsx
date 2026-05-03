"use client";

import Link from "next/link";
import { OUTING_IMAGE_FILTER } from "@/features/sortie/lib/image-filter";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { Eyebrow, type EyebrowTone } from "./eyebrow";
import { FocusableEyebrow, useEyebrowFocusSectionRef } from "./eyebrow-focus";
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
  /** Quand passé, l'eyebrow s'aligne sur le focus actif piloté par
   * `<EyebrowFocusProvider>`. La `<section>` racine est observée pour
   * détecter quand cette rangée occupe la bande centrale du viewport.
   * Sans focusId : rendu standalone, comportement legacy. */
  focusId?: string;
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
  focusId,
}: Props) {
  const sectionRef = useEyebrowFocusSectionRef<HTMLElement>(focusId);
  const eyebrowText = `─ ${eyebrowLabel}${showCount ? ` · ${String(count).padStart(2, "0")}` : ""} ─`;
  return (
    <section ref={sectionRef} className="mb-7 -mx-6" aria-labelledby={headingId}>
      {focusId ? (
        <FocusableEyebrow focusId={focusId} id={headingId} className="mb-3 px-6">
          {eyebrowText}
        </FocusableEyebrow>
      ) : (
        <Eyebrow id={headingId} tone={tone} glow={glow} className="mb-3 px-6">
          {eyebrowText}
        </Eyebrow>
      )}
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
 * Découpe un badge composite "<part1> · <part2>" pour pouvoir tronquer
 * UNIQUEMENT la partie "anchor" (le handle, longue) tout en gardant la
 * partie "tail" (le numéro `№ 047`, courte mais signifiante) intacte.
 *
 * Avant : `truncate` sur tout le badge → "@CAMILLE-TEST · M…" coupait
 * le numéro qui est pourtant l'objet collectionnable de l'app. Le
 * numéro doit rester entier coûte que coûte.
 */
function splitBadge(raw: string): { anchor: string; tail: string | null } {
  // Bullet milieu utilisé dans `followed-outings-row.tsx` : "@h · № 47".
  // Pas de regex — séparateur exact, on n'attend qu'une occurrence.
  const idx = raw.indexOf(" · ");
  if (idx <= 0 || idx >= raw.length - 3) {
    return { anchor: raw, tail: null };
  }
  return { anchor: raw.slice(0, idx), tail: raw.slice(idx + 3) };
}

/**
 * Card individuelle 144-168px de large, aspect 8/9 (poster) ou 1/1
 * (square, discovery) + badge texte (date, handle, etc.) en overlay
 * bottom-left. Exporté pour pouvoir être consommé en dehors du shell
 * (rendus ad-hoc, tests).
 *
 * Comportement du titre sous la card :
 *  - Avec image : on garde le titre crème en h3 sous la card. La photo
 *    seule ne porte pas l'info, le label est nécessaire.
 *  - Sans image (mode title fallback) : le titre vit DÉJÀ dans la card
 *    en typo poster, le répéter dessous crée une soupe (deux lectures
 *    pour la même info, ralentit le scan). On garde juste un h3 visuel-
 *    lement masqué pour l'a11y (screen-reader / SEO du titre du lien).
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
  const hasImage = Boolean(outing.heroImageUrl);
  const { anchor, tail } = splitBadge(badge);

  return (
    <Link
      href={href}
      // `[@media(hover:hover)]:` cible uniquement les pointers fins (souris).
      // Sur tactile le `:hover` reste sticky après tap (iOS/Android), ce qui
      // figeait le titre en acide vif comme un état "actif" trompeur.
      className="group block w-36 rounded-xl touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 sm:w-[168px]"
    >
      <div
        className={`relative ${aspectClass} overflow-hidden rounded-xl bg-surface-100 ring-1 ring-ink-700/5 transition-transform duration-300 motion-safe:group-active:scale-[0.98] [@media(hover:hover)]:motion-safe:group-hover:-translate-y-0.5`}
      >
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outing.heroImageUrl ?? ""}
              alt=""
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="size-full object-cover object-top"
              style={{ filter: OUTING_IMAGE_FILTER }}
            />
            {/* Scrim de protection bas de card : amortit la pill auteur
                qui sinon paraît "patchée" sur les affiches claires. Le
                gradient démarre transparent à 50% pour ne toucher que
                le tiers inférieur (où vit la pill), garde l'affiche
                propre dans ses 2/3 supérieurs. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          </>
        ) : (
          <OutingPosterFallback title={outing.title} className="size-full" mode="title" varied />
        )}
        {/* Tampon discret bas-gauche : pas un "objet posé sur l'image"
            (ancien fond crème-clair faisait corps étranger sur la
            palette sombre), mais un overprint mono qui s'inscrit dans
            le fond. Pas de pill arrondie, juste un cadre sérigraphié
            avec border crème 30% et fond noir semi-transparent. */}
        <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 border border-ink-700/25 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] text-ink-700/85 backdrop-blur-[2px]">
          <span className="truncate">{anchor}</span>
          {tail && (
            // Tail (№ 047) jamais tronqué : il porte la valeur signifiante
            // de la pill (objet collectionnable identifiant la sortie chez
            // ce créateur). Couleur acid pour signaler son statut "asset".
            <span className="shrink-0 font-bold text-acid-600">· {tail}</span>
          )}
        </span>
      </div>
      {hasImage ? (
        <h3 className="mt-2 line-clamp-2 font-display text-[13px] leading-tight font-black tracking-[-0.025em] text-ink-700 transition-colors [@media(hover:hover)]:group-hover:text-acid-600">
          {outing.title}
        </h3>
      ) : (
        // Titre déjà rendu en typo poster dans la card par le fallback ;
        // on préserve juste l'élément pour les screen-readers et le SEO du
        // lien (sans le visuel doublonné qui polluait le scan).
        <h3 className="sr-only">{outing.title}</h3>
      )}
    </Link>
  );
}
