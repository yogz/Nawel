"use client";

import { useState } from "react";
import { sendGAEvent } from "@/lib/umami";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";
import { LANDING_EVENTS } from "./landing-events";
import { RevealOnScroll } from "./reveal-on-scroll";

const DAY = 86_400_000;

type Mock = {
  id: string;
  shortId: string;
  slug: string;
  title: string;
  location: string;
  daysFromNow: number;
  deadlineDaysFromNow: number;
  confirmedCount: number;
};

// 4 sorties parisiennes/françaises plausibles pour donner une idée
// du grain produit en un coup d'œil. Pas de copy promo — montrer
// le mode de vie, pas le décrire. Mix d'échelles de groupe (3 → 12)
// et d'horizons (J+10 → J+45) pour signaler la diversité d'usages.
const MOCKS: ReadonlyArray<Mock> = [
  {
    id: "vibe-phedre",
    shortId: "vibephd1",
    slug: "phedre-comedie-francaise",
    title: "Phèdre — Comédie-Française",
    location: "Comédie-Française · Salle Richelieu",
    daysFromNow: 30,
    deadlineDaysFromNow: 7,
    confirmedCount: 5,
  },
  {
    id: "vibe-charmatz",
    shortId: "vibechrm",
    slug: "boris-charmatz-centquatre",
    title: "Boris Charmatz — Liberté Cathédrale",
    location: "Centquatre-Paris",
    daysFromNow: 18,
    deadlineDaysFromNow: 5,
    confirmedCount: 8,
  },
  {
    id: "vibe-reflet",
    shortId: "vibrflt9",
    slug: "projection-minuit-reflet-medicis",
    title: "Mulholland Drive — séance de minuit",
    location: "Le Reflet Médicis",
    daysFromNow: 12,
    deadlineDaysFromNow: 3,
    confirmedCount: 3,
  },
  {
    id: "vibe-nuits-sonores",
    shortId: "vibnts22",
    slug: "festival-nuits-sonores",
    title: "Nuits sonores — Lyon, 4 jours",
    location: "Lyon · plusieurs lieux",
    daysFromNow: 45,
    deadlineDaysFromNow: 15,
    confirmedCount: 12,
  },
];

/**
 * Wall of vibes : grid de mocks pour montrer ce que le produit
 * permet sans une ligne de copy promo. Une carte montre le produit ;
 * quatre cartes montrent un mode de vie. Inerte (pointer-events-none
 * + inert + aria-hidden) — les Link internes des cards pointeraient
 * vers des 404, et un user kbd ne doit pas pouvoir Tab/Enter dessus.
 */
export function SectionWallOfVibes() {
  // Snapshot au mount pour stabiliser les dates : Vercel garde le module
  // chaud, dater au module load créerait un faux signal "deadline
  // expirée" sur des SSR espacés.
  const [outings] = useState(() => {
    const now = Date.now();
    return MOCKS.map((m) => ({
      id: m.id,
      shortId: m.shortId,
      slug: m.slug,
      title: m.title,
      location: m.location,
      startsAt: new Date(now + m.daysFromNow * DAY),
      deadlineAt: new Date(now + m.deadlineDaysFromNow * DAY),
      status: "open",
      mode: "fixed" as const,
      heroImageUrl: null,
      confirmedCount: m.confirmedCount,
    }));
  });

  return (
    <RevealOnScroll
      onReveal={() =>
        sendGAEvent("event", LANDING_EVENTS.sectionVisible, { section: "wall-of-vibes" })
      }
      className="mt-20 sm:mt-24"
    >
      <section className="px-6">
        <Eyebrow glow className="mb-3">
          ─ ce que tu pourrais avoir ─
        </Eyebrow>
        <h2
          className="mb-8 font-display text-[34px] leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl"
          style={{ textWrap: "balance" }}
        >
          Une saison.
          <br />
          <span className="text-acid-600">Pas un sondage.</span>
        </h2>

        <ul
          aria-hidden
          // @ts-expect-error — `inert` est dispo en HTML5 mais pas
          // encore typé sur React.HTMLAttributes selon les versions.
          inert=""
          className="pointer-events-none flex flex-col gap-3"
        >
          {outings.map((o) => (
            <li key={o.id}>
              <OutingProfileCard
                outing={o}
                showRsvp={false}
                myRsvp={null}
                outingBaseUrl="https://sortie.colist.fr"
                isPast={false}
              />
            </li>
          ))}
        </ul>
      </section>
    </RevealOnScroll>
  );
}
