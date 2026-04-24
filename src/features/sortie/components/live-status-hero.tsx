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
 * Big "what's next" card — the top-of-page focus on both the logged-in
 * home and the public profile. Gradient identity stays, but when the
 * outing has a hero image, we ghost it heavily on top of the gradient
 * so the card picks up a hint of the actual poster without drowning
 * the text.
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

  // When we only know `confirmed`, skip the "en attente" suffix entirely —
  // showing "5 confirmés · 0 en attente" would be noisy noise.
  const pending = total !== undefined ? Math.max(0, total - confirmed) : 0;
  const headcount =
    total === 0
      ? "Personne n'a encore répondu"
      : `${confirmed} confirmé${confirmed > 1 ? "s" : ""}${pending > 0 ? ` · ${pending} en attente` : ""}`;

  return (
    <Link
      href={`/${canonical}`}
      className="relative mb-10 block overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFE1D7] via-[#FAF7F2] to-[#D7E0FF] p-6 shadow-[var(--shadow-velvet)] transition-transform active:scale-[0.99]"
    >
      {heroImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          aria-hidden="true"
          // Scale up so the blur's soft edges don't expose the card
          // border. Opacity low enough that any poster palette can sit
          // under the text without compromising contrast.
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
        />
      )}
      <div className="relative z-10">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-bordeaux-700">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-4xl leading-[0.98] font-extrabold tracking-tight text-encre-700 sm:text-5xl">
          {relativeOutingHero(startsAt)}
        </h1>
        <p className="mt-4 text-base text-encre-600">
          <span className="font-bold text-encre-700">{title}</span>
          {location && <span className="text-encre-500"> · {location}</span>}
        </p>
        <p className="mt-1 text-sm text-encre-500">{headcount}</p>
      </div>
    </Link>
  );
}
