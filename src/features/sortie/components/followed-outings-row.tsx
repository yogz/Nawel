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
      eyebrowLabel="dans ton réseau"
      count={outings.length}
      ariaLabel="Sorties des comptes que tu suis, faites défiler horizontalement"
      tone="muted"
      glow={false}
      showCount={false}
      aspect="square"
      items={outings.map((o) => {
        const handle = o.creatorUsername ? `@${o.creatorUsername}` : o.creatorName;
        // Suffixe "№ 047" sur la pill quand le créateur loggé a un compteur.
        // Format inline pour rester compact dans la pill 9.5px existante —
        // le numéro signe la card sans nécessiter un overlay séparé.
        const badge =
          o.creatorOutingNumber !== null
            ? `${handle} · № ${o.creatorOutingNumber < 1000 ? String(o.creatorOutingNumber).padStart(3, "0") : o.creatorOutingNumber}`
            : handle;
        return {
          outing: {
            id: o.id,
            shortId: o.shortId,
            slug: o.slug,
            title: o.title,
            heroImageUrl: o.heroImageUrl,
          },
          badge,
        };
      })}
    />
  );
}
