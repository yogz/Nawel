"use client";

import { sendGAEvent } from "@/lib/umami";
import { OutingProfileCard } from "@/features/sortie/components/outing-profile-card";
import { RevealOnScroll } from "./reveal-on-scroll";

// Mock plausible : sortie cultu type, futur proche, deadline pas encore
// passée — la card ne doit montrer aucun lock badge (sinon faux signal
// "déjà fermée"). 4 confirmés = nombre crédible pour un partage WhatsApp
// d'un soir entre amis.
const MOCK_OUTING = {
  id: "demo-mock",
  shortId: "demoshow",
  slug: "phedre-comedie-francaise",
  title: "Phèdre — Comédie-Française",
  location: "Comédie-Française · Salle Richelieu",
  startsAt: new Date(Date.now() + 30 * 86_400_000), // J+30
  deadlineAt: new Date(Date.now() + 7 * 86_400_000), // J+7
  status: "open",
  mode: "fixed" as const,
  heroImageUrl: null, // fallback gradient + initiale "P"
  confirmedCount: 4,
};

const BULLETS = [
  "rsvp en 1 tap, sans compte",
  "checklist places, paiement, qui doit quoi",
  "relances auto avant la deadline",
] as const;

/**
 * Showcase d'une card de sortie pour répondre à "à quoi ça ressemble
 * une fois lancée ?". On rend la vraie `OutingProfileCard` avec data
 * mockée ; pas de phone-frame, pas de mockup chrome — direct sur fond
 * noir avec halo acid bas-opacité. La carte est inerte (le `Link`
 * intérieur cliquerait vers `/phedre-comedie-francaise-demoshow` qui
 * n'existe pas) — on l'enveloppe dans un `pointer-events-none` pour
 * éviter une 404 accidentelle.
 */
export function SectionCardShowcase() {
  return (
    <RevealOnScroll
      onReveal={() => sendGAEvent("event", "landing_section_visible", { section: "card-showcase" })}
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
          className="mb-10 text-[36px] leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl"
          style={{
            textWrap: "balance",
            fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
          }}
        >
          La sortie,
          <br />
          <span className="text-acid-600">sur une seule carte.</span>
        </h2>

        <div className="relative mb-8">
          {/* Halo acid bas-opacité derrière la card pour la décoller du
              fond sans tomber dans le shadow SaaS classique. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 -m-8 opacity-50"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(199,255,60,0.18) 0%, transparent 65%)",
            }}
          />
          <div className="-rotate-2 transition-transform duration-500 hover:rotate-0">
            {/* pointer-events-none → la card est inerte au clic (sa
                Link interne pointerait vers une 404). On garde le rendu
                visuel complet mais on bloque la nav. */}
            <div className="pointer-events-none">
              <OutingProfileCard
                outing={MOCK_OUTING}
                showRsvp={false}
                myRsvp={null}
                outingBaseUrl="https://sortie.colist.fr"
                isPast={false}
              />
            </div>
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
