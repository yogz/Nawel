import Link from "next/link";
import { relativeOutingHero } from "@/features/sortie/lib/relative-date";

type Props = {
  slug: string | null;
  shortId: string;
  title: string;
  location: string | null;
  startsAt: Date;
  confirmed: number;
  /**
   * Total of everyone-not-saying-no — used to add "· N en attente" to the
   * headcount string. Optional: on the public profile view we don't pull
   * that figure and it's fine to show just the confirmed count.
   */
  total?: number;
  heroImageUrl?: string | null;
  /**
   * Eyebrow text above the relative date. Defaults to "Ta prochaine
   * sortie" for the logged-in home view. Pass "Prochaine sortie" (or a
   * name-prefixed variant) when rendering on a public profile where "ta"
   * is weird.
   */
  eyebrow?: string;
};

/**
 * Big "what's next" section for both the logged-in home and the public
 * profile. The date + title + headcount stack as text; the poster sits
 * below as a hero-sized block. Portrait posters are shown contained
 * over a blurred version of themselves as backdrop — the Spotify /
 * Letterboxd pattern — so the affiche's full composition is visible
 * without a crop.
 */
export function LiveStatusHero({
  slug,
  shortId,
  title,
  location,
  startsAt,
  confirmed,
  total,
  heroImageUrl,
  eyebrow = "Ta prochaine sortie",
}: Props) {
  const canonical = slug ? `${slug}-${shortId}` : shortId;

  // Show a headcount only when there's actually one to show. "0 confirmé"
  // on a shareable vitrine reads as "nobody's going" — negative social
  // proof on the very card we most want to convert. Hide until at least
  // one person has said yes.
  const pending = total !== undefined ? Math.max(0, total - confirmed) : 0;
  const headcount =
    confirmed > 0
      ? `${confirmed} confirmé${confirmed > 1 ? "s" : ""}${pending > 0 ? ` · ${pending} en attente` : ""}`
      : null;

  return (
    <section className="mb-10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-700">
        {eyebrow}
      </p>
      <Link href={`/${canonical}`} className="group block transition-transform active:scale-[0.99]">
        <h2 className="text-3xl leading-[1.02] font-extrabold tracking-tight text-encre-700 group-hover:text-bordeaux-700 sm:text-4xl">
          {relativeOutingHero(startsAt)}
        </h2>
        <p className="mt-2 text-base text-encre-600">
          <span className="font-bold text-encre-700">{title}</span>
          {location && <span className="text-encre-500"> · {location}</span>}
        </p>
        {headcount && <p className="mt-1 text-sm text-encre-500">{headcount}</p>}

        {heroImageUrl ? (
          // Blurred-backdrop + contained foreground. Portrait theatre
          // posters lose their meaning when cropped landscape; this
          // pattern keeps the affiche whole while the colour palette
          // fills the card.
          <div className="relative mt-5 aspect-[16/10] w-full overflow-hidden rounded-3xl shadow-[var(--shadow-velvet)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImageUrl} alt="" className="relative mx-auto h-full object-contain" />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="mt-5 aspect-[16/10] w-full rounded-3xl bg-gradient-to-br from-[#FFE1D7] via-[#FAF7F2] to-[#D7E0FF] shadow-[var(--shadow-velvet)]"
          />
        )}
      </Link>
    </section>
  );
}
