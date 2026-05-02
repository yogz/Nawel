import { formatCreatedAgo } from "@/features/sortie/lib/format-created-ago";
import { OutingPosterRow, type PosterOuting } from "./outing-poster-row";

type Outing = PosterOuting & {
  createdAt: Date;
};

type Props = {
  outings: Outing[];
};

/**
 * Bandeau scroll-snap horizontal des dernières sorties créées au RSVP/
 * vote encore ouvert. Posé entre le header et le hero — vitrine
 * éditoriale de fraîcheur, à distinguer de la checklist "À venir" en
 * dessous.
 *
 * Thin wrapper sur `<OutingPosterRow>` : la mise en forme du shell
 * (scroll-snap, mask gradient, accessibilité) est partagée avec
 * `<FollowedOutingsRow>`. Le badge ici = ancienneté de la création.
 */
export function RecentlyAddedRow({ outings }: Props) {
  return (
    <OutingPosterRow
      headingId="recently-added-heading"
      eyebrowLabel="derniers ajoutés"
      count={outings.length}
      ariaLabel="Sorties récemment ajoutées, faites défiler horizontalement"
      tone="acid"
      items={outings.map((o) => ({
        outing: {
          id: o.id,
          shortId: o.shortId,
          slug: o.slug,
          title: o.title,
          heroImageUrl: o.heroImageUrl,
        },
        badge: formatCreatedAgo(o.createdAt),
      }))}
    />
  );
}
