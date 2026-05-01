import Link from "next/link";
import { formatCreatedAgo } from "@/features/sortie/lib/format-created-ago";
import { Eyebrow } from "./eyebrow";

type Outing = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  heroImageUrl: string | null;
  createdAt: Date;
};

type Props = {
  outings: Outing[];
};

/**
 * Bandeau scroll-snap horizontal des dernières sorties créées par le
 * profil et dont le RSVP/vote est encore ouvert. Posé entre le header
 * et le hero — rôle éditorial de **vitalité** ("ce que je viens de
 * lancer"), à distinguer de la section "À venir" plus bas qui reste
 * la checklist actionnable.
 *
 * Direction "Bandeau récents" — décidée après revue UX + graphic +
 * devil's advocate :
 *   - cards 4:5 (neutre cinéma/concert/resto, pas un poster portrait
 *     ciné), 144×180 mobile / 168×210 ≥sm
 *   - scroll-snap **proximity** (pas mandatory) — sur iOS Safari le
 *     mandatory + swipe diagonal kidnappe le scroll vertical de la page
 *   - aucun titre/lieu/countdown sur la card : seul l'overlay
 *     `IL Y A 2J` signe la **fraîcheur de curation** ; le titre
 *     éditorial vit dessous, hors de l'image
 *   - mask-image fade droit sur l'ul = signal "ça continue" sans
 *     chevron ni dot indicators
 *   - role="list" + aria-label, PAS aria-roledescription="carousel"
 *     (ce n'est pas un carousel à 1 slide focus, c'est une row
 *     d'items à parcourir — cf. pattern Spotify/App Store)
 *
 * Visibilité: le filtre + le seuil d'affichage (≥2 cards après
 * exclusion du hero) sont gérés côté page profil, pas ici. Si le
 * composant est rendu, il a au minimum 2 entrées valides.
 */
export function RecentlyAddedRow({ outings }: Props) {
  const count = outings.length;

  return (
    <section className="mb-7 -mx-6" aria-labelledby="recently-added-heading">
      <Eyebrow tone="acid" glow className="mb-3 px-6">
        <span id="recently-added-heading">
          ─ derniers ajoutés · {String(count).padStart(2, "0")} ─
        </span>
      </Eyebrow>
      <ul
        role="list"
        aria-label="Sorties récemment ajoutées, faites défiler horizontalement"
        className="flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {outings.map((o) => (
          <li key={o.id} className="shrink-0 snap-start">
            <RecentCard outing={o} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentCard({ outing }: { outing: Outing }) {
  const canonical = outing.slug ? `${outing.slug}-${outing.shortId}` : outing.shortId;
  const href = `/${canonical}`;
  const ago = formatCreatedAgo(outing.createdAt);

  return (
    <Link
      href={href}
      className="group block w-36 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 sm:w-[168px]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-100 ring-1 ring-ink-700/5 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5">
        {outing.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={outing.heroImageUrl}
            alt=""
            className="size-full object-cover object-top"
            // Saturate/contrast aligné sur OutingProfileCard et OutingHero
            // pour cohérence cross-surface malgré les sources hétérogènes
            // (Ticketmaster, Fnac, AllOcc, uploads users).
            style={{ filter: "saturate(1.15) contrast(1.05)" }}
          />
        ) : (
          <FallbackPanel title={outing.title} />
        )}
        <span className="absolute bottom-2 left-2 inline-flex items-center rounded-sm bg-ink-700/60 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-surface-50 backdrop-blur-sm">
          {ago}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 font-display text-[13px] leading-tight font-black tracking-[-0.025em] text-ink-700 transition-colors group-hover:text-acid-600">
        {outing.title}
      </h3>
    </Link>
  );
}

/**
 * Fallback poster-less : initiale du titre sur radial-gradient acid+hot,
 * vocabulaire visuel partagé avec OutingProfileCard et LiveStatusHero.
 * Le devil's advocate a flagué le risque "C C C C" si plusieurs titres
 * commencent par la même lettre (créateur qui aligne 4 "Concert …") —
 * on dérive un index 0–3 du hash du titre pour permuter les positions
 * des hot-spots, ce qui donne 4 compositions distinctes sans introduire
 * de teintes hors palette.
 */
function FallbackPanel({ title }: { title: string }) {
  const initial = (title.trim().charAt(0) || "·").toLocaleUpperCase("fr");
  const variant = hashTitle(title) % FALLBACK_VARIANTS.length;
  const { hotPos, acidPos } = FALLBACK_VARIANTS[variant];

  return (
    <div
      aria-hidden="true"
      className="relative flex size-full items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(circle at ${hotPos}, #FF3D81 0%, transparent 50%), radial-gradient(circle at ${acidPos}, #C7FF3C 0%, transparent 50%), #1a1a1a`,
      }}
    >
      <span
        className="font-display text-5xl font-black leading-none tracking-tight text-ink-50 opacity-50 select-none"
        style={{ mixBlendMode: "overlay" }}
      >
        {initial}
      </span>
    </div>
  );
}

const FALLBACK_VARIANTS = [
  { hotPos: "30% 20%", acidPos: "75% 80%" },
  { hotPos: "75% 25%", acidPos: "20% 75%" },
  { hotPos: "50% 85%", acidPos: "50% 15%" },
  { hotPos: "20% 50%", acidPos: "80% 50%" },
] as const;

function hashTitle(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
