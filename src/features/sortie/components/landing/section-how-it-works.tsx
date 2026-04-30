"use client";

import { sendGAEvent } from "@/lib/umami";
import { RevealOnScroll } from "./reveal-on-scroll";

const STEPS = [
  {
    n: "01",
    text: "Tu choisis ce que tu vas voir. Date, lieu, prix.",
  },
  {
    n: "02",
    text: "Tu balances le lien sur le groupe. Ils répondent d'un tap.",
  },
  {
    n: "03",
    text: "Tu vois qui vient. Qui doit combien. Qui a payé.",
  },
] as const;

/**
 * Triptyque typographique pur (numéros + texte, pas de screenshot ni
 * d'icône). Le H1 hero ("Organise. Ils répondent. Tu sais.") nomme les
 * 3 phases ; cette section les concrétise (date+lieu+prix → lien
 * groupé → comptes). Granularité différente, pas de redite.
 */
export function SectionHowItWorks() {
  return (
    <RevealOnScroll
      onReveal={() => sendGAEvent("event", "landing_section_visible", { section: "how-it-works" })}
      className="mt-16 sm:mt-24"
    >
      <section className="px-6">
        <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-acid-600">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-acid-600 shadow-[0_0_12px_var(--sortie-acid)]"
          />
          ─ comment ça marche ─
        </p>
        <h2
          className="mb-10 text-[36px] leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl"
          style={{
            textWrap: "balance",
            fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
          }}
        >
          Tu colles le lien.
          <br />
          <span className="text-acid-600">Le reste suit.</span>
        </h2>

        <ol className="flex flex-col gap-8">
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-4">
              <span
                aria-hidden
                className="shrink-0 text-[44px] leading-[0.85] font-black tracking-[-0.04em] text-acid-600/40 sm:text-[56px]"
                style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
              >
                {step.n}
              </span>
              <p className="flex-1 pt-1 text-[18px] leading-[1.4] font-semibold text-ink-700 sm:text-[20px]">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </RevealOnScroll>
  );
}
