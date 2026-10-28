import Image from "next/image";
import { formatVenue } from "@/features/sortie/lib/format-venue";
import { OUTING_IMAGE_FILTER } from "@/features/sortie/lib/image-filter";
import { getPastOutingClasses } from "@/features/sortie/lib/past-outing-classes";
import type { ShowcaseOuting } from "@/features/sortie/lib/profile-outings";
import { OutingPosterFallback } from "./outing-poster-fallback";

type Props = {
  outing: ShowcaseOuting;
  isPast: boolean;
  // Fournis seulement en lien privé, pour les sorties d'autrui. La vitrine
  // publique n'envoie jamais de date au navigateur.
  dateLabel?: string | null;
  organizerLabel?: string | null;
};

/**
 * Carte inerte du profil : même rangée image + titre + salle que
 * `OutingProfileCard`, mais ni lien ni action. Sert à la vitrine publique
 * (toutes les sorties) et, en lien privé, aux sorties d'autrui où
 * l'utilisateur va — personne ne doit pouvoir s'y inscrire depuis le
 * profil (cf. spec 2026-10-28-sortie-profile-attending §5 bis).
 */
export function OutingShowcaseCard({ outing, isPast, dateLabel, organizerLabel }: Props) {
  const pastClasses = getPastOutingClasses(isPast);
  const venue = formatVenue(outing.location);

  return (
    <article
      className={`flex items-center gap-3 rounded-xl bg-surface-50 p-3 ring-1 ring-ink-700/5 ${pastClasses.wrapper}`}
    >
      {outing.heroImageUrl ? (
        <Image
          src={outing.heroImageUrl}
          alt=""
          width={64}
          height={64}
          unoptimized
          sizes="64px"
          loading="lazy"
          className={`size-16 shrink-0 rounded-md bg-surface-100 object-cover object-top ${pastClasses.image}`}
          style={isPast ? undefined : { filter: OUTING_IMAGE_FILTER }}
        />
      ) : (
        <OutingPosterFallback
          title={outing.title}
          className={`size-16 shrink-0 rounded-md ${pastClasses.image}`}
          textClassName="text-2xl opacity-50"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {dateLabel && (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-acid-600">
            {dateLabel}
          </p>
        )}
        <h3
          className={`truncate text-[17px] leading-tight font-black tracking-[-0.025em] ${pastClasses.title}`}
        >
          {outing.title}
        </h3>
        {venue && <p className={`truncate text-[13px] ${pastClasses.meta}`}>{venue}</p>}
        {organizerLabel && (
          <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
            {organizerLabel}
          </p>
        )}
      </div>
    </article>
  );
}
