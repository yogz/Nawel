import { OutingPosterRow } from "./outing-poster-row";

type Outing = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  heroImageUrl: string | null;
  creatorUsername: string | null;
  creatorName: string | null;
};

type Props = {
  outings: Outing[];
};

/**
 * Carrousel "tes suivis" affiché sur la home entre le hero et les
 * `UpcomingBuckets`. Sémantique : sorties des créateurs que tu suis sur
 * lesquelles tu n'as pas encore RSVP — quand tu réponds, la card sort
 * du carrousel et entre dans tes buckets. Cf. listFollowedOutingsForCarousel.
 *
 * Badge sur chaque card = handle du créateur (`@bob`) plutôt que la
 * recency : sur ce carrousel ce qui compte c'est *qui* a posté, pas
 * *quand* (cohérent avec l'intent du suivi). Fallback prénom si le
 * créateur n'a pas (encore) choisi un username — rare en pratique
 * puisqu'un follow implique une page profil avec lien privé, donc un
 * username défini.
 */
export function FollowedOutingsRow({ outings }: Props) {
  return (
    <OutingPosterRow
      headingId="followed-outings-heading"
      eyebrowLabel="tes suivis"
      count={outings.length}
      ariaLabel="Sorties des comptes que tu suis, faites défiler horizontalement"
      items={outings.map((o) => ({
        outing: o,
        badge: o.creatorUsername ? `@${o.creatorUsername}` : (o.creatorName ?? "@—"),
      }))}
    />
  );
}
