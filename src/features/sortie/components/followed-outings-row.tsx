import { OutingPosterRow } from "./outing-poster-row";
import type { FollowedCarouselOuting } from "@/features/sortie/queries/follow-queries";

type Props = {
  outings: FollowedCarouselOuting[];
};

/**
 * Carrousel "des suivis suivent" — sorties à venir des créateurs que le
 * viewer suit, déjà filtrées server-side (NOT EXISTS sur sa propre row
 * participant pour éviter le doublon avec `<HomeMonthAgenda>`). Posé
 * juste au-dessus de l'agenda mensuel.
 *
 * Badge = `@<creatorUsername>` (fallback display name si pas de username
 * — cas rare, un user peut suivre un compte qui a follow-back avant
 * d'avoir set son handle).
 */
export function FollowedOutingsRow({ outings }: Props) {
  if (outings.length === 0) {
    return null;
  }

  return (
    <OutingPosterRow
      headingId="followed-outings-heading"
      eyebrowLabel="des suivis suivent"
      count={outings.length}
      ariaLabel="Sorties des comptes que tu suis, faites défiler horizontalement"
      tone="hot"
      items={outings.map((o) => ({
        outing: {
          id: o.id,
          shortId: o.shortId,
          slug: o.slug,
          title: o.title,
          heroImageUrl: o.heroImageUrl,
        },
        badge: o.creatorUsername ? `@${o.creatorUsername}` : o.creatorName,
      }))}
    />
  );
}
