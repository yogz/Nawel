import Link from "next/link";
import { formatCreatedAgo } from "@/features/sortie/lib/format-created-ago";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { Eyebrow } from "./eyebrow";
import { OutingPosterFallback } from "./outing-poster-fallback";

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
 * Bandeau scroll-snap horizontal des dernières sorties créées au RSVP/
 * vote encore ouvert. Posé entre le header et le hero — vitrine
 * éditoriale de fraîcheur, à distinguer de la checklist "À venir" en
 * dessous.
 *
 * Choix non-évidents :
 *  - `snap-proximity` (pas mandatory) : sur iOS Safari, mandatory + swipe
 *    diagonal kidnappe le scroll vertical de la page (interaction
 *    principale d'une page mobile-first).
 *  - `role="list"`, pas `aria-roledescription="carousel"` : ce n'est
 *    pas un carousel à 1 slide focus, c'est une row d'items à parcourir
 *    (pattern Spotify / App Store).
 */
export function RecentlyAddedRow({ outings }: Props) {
  return (
    <section className="mb-7 -mx-6" aria-labelledby="recently-added-heading">
      <Eyebrow id="recently-added-heading" tone="acid" glow className="mb-3 px-6">
        ─ derniers ajoutés · {String(outings.length).padStart(2, "0")} ─
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
            loading="lazy"
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
          {formatCreatedAgo(outing.createdAt)}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 font-display text-[13px] leading-tight font-black tracking-[-0.025em] text-ink-700 transition-colors group-hover:text-acid-600">
        {outing.title}
      </h3>
    </Link>
  );
}
