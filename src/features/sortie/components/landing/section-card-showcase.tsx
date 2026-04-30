"use client";

import { useState } from "react";
import { sendGAEvent } from "@/lib/umami";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";
import { LANDING_EVENTS } from "./landing-events";
import { RevealOnScroll } from "./reveal-on-scroll";

const BULLETS = [
  "rsvp en 1 tap, sans compte",
  "checklist places, paiement, qui doit quoi",
  "relances auto avant la deadline",
] as const;

/**
 * Showcase d'une card pour répondre à "à quoi ça ressemble une fois
 * lancée ?". La carte est inerte (`pointer-events-none` + `inert` +
 * `aria-hidden`) — son `<Link>` interne pointerait vers une 404 et
 * un user kbd qui Tab dessus ne doit pas pouvoir Enter.
 */
export function SectionCardShowcase() {
  // useState lazy init : `new Date(Date.now() + …)` au module load
  // finirait par dater (Vercel garde le module chaud entre requêtes).
  // Au mount du composant on prend une fresh snapshot, stable pour la
  // vie de l'instance. Si la deadline expirait, OutingProfileCard
  // afficherait un lock badge — faux signal "déjà fermée".
  const [mockOuting] = useState(() => ({
    id: "demo-mock",
    shortId: "demoshow",
    slug: "phedre-comedie-francaise",
    title: "Phèdre — Comédie-Française",
    location: "Comédie-Française · Salle Richelieu",
    startsAt: new Date(Date.now() + 30 * 86_400_000),
    deadlineAt: new Date(Date.now() + 7 * 86_400_000),
    status: "open",
    mode: "fixed" as const,
    heroImageUrl: null,
    confirmedCount: 4,
  }));

  return (
    <RevealOnScroll
      onReveal={() =>
        sendGAEvent("event", LANDING_EVENTS.sectionVisible, { section: "card-showcase" })
      }
      className="mt-20 sm:mt-28"
    >
      <section className="px-6">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          ─ une carte, tout dedans ─
        </p>
        <h2
          className="mb-10 font-display text-[36px] leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl"
          style={{ textWrap: "balance" }}
        >
          La sortie,
          <br />
          <span className="text-acid-600">sur une seule carte.</span>
        </h2>

        <div className="relative mb-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 -m-8 opacity-50"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(199,255,60,0.18) 0%, transparent 65%)",
            }}
          />
          <div
            aria-hidden
            // @ts-expect-error — `inert` est dispo en HTML5 mais pas
            // encore typé sur React.HTMLAttributes selon les versions.
            inert=""
            className="pointer-events-none -rotate-2"
          >
            <OutingProfileCard
              outing={mockOuting}
              showRsvp={false}
              myRsvp={null}
              outingBaseUrl="https://sortie.colist.fr"
              isPast={false}
            />
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {BULLETS.map((b) => (
            <li
              key={b}
              className="font-mono text-[11.5px] uppercase tracking-[0.22em] text-ink-400"
            >
              ─ {b}
            </li>
          ))}
        </ul>
      </section>
    </RevealOnScroll>
  );
}
