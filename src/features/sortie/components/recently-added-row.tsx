import { formatCreatedAgo } from "@/features/sortie/lib/format-created-ago";
import { OutingPosterRow } from "./outing-poster-row";

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
 * Wrapper "recency" autour d'`OutingPosterRow`. Badge sur chaque card =
 * âge relatif de la sortie ("il y a 2j"). Posé entre le header et le
 * hero sur le profil public — vitrine éditoriale de fraîcheur, à
 * distinguer de la checklist "À venir" en dessous.
 */
export function RecentlyAddedRow({ outings }: Props) {
  return (
    <OutingPosterRow
      headingId="recently-added-heading"
      eyebrowLabel="derniers ajoutés"
      count={outings.length}
      ariaLabel="Sorties récemment ajoutées, faites défiler horizontalement"
      items={outings.map((o) => ({
        outing: o,
        badge: formatCreatedAgo(o.createdAt),
      }))}
    />
  );
}
