"use client";

import { useEffect } from "react";
import Link from "next/link";
import { sendGAEvent } from "@/lib/umami";
import { LoginLink } from "@/features/sortie/components/login-link";
import { PublicHero } from "./public-hero";
import { SectionHowItWorks } from "./section-how-it-works";
import { SectionCardShowcase } from "./section-card-showcase";

/**
 * Landing publique pour visiteur unauth fresh sur `/`. Compose le hero
 * historique (intact) + 2 sections explicatives + CTA bottom répété.
 * Le branching `AnonInbox` (returning anon avec cookie token + RSVP)
 * reste prioritaire en amont — cette landing ne s'affiche que sur le
 * cas "blind / first visit".
 *
 * Un seul `landing_v2_view` au mount pour distinguer ce flux des
 * landings éventuelles à venir (variants A/B futurs si volume grossit).
 */
export function LandingV2() {
  useEffect(() => {
    sendGAEvent("event", "landing_v2_view");
  }, []);

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-2xl flex-col pb-16">
      <PublicHero />
      <SectionHowItWorks />
      <SectionCardShowcase />

      {/* CTA bottom répété — même bouton que le hero pour cohérence
          d'identité, à un moment où le visiteur a fini de scanner les
          sections et a besoin d'une porte de sortie évidente. */}
      <section className="mt-16 px-6 text-center sm:mt-24">
        <Link
          href="/nouvelle"
          onClick={() => sendGAEvent("event", "landing_cta_click", { position: "bottom" })}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-acid-600 px-7 py-4 text-[17px] font-black text-ink-50 shadow-[var(--shadow-acid)] transition-transform [transition-duration:var(--dur-fast)] hover:scale-[1.02] motion-safe:active:scale-[0.98] sm:w-auto"
          style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
        >
          Lancer une sortie
          <span
            aria-hidden
            className="transition-transform [transition-duration:var(--dur-base)] group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
        <div className="mt-5">
          <LoginLink
            className="font-mono text-xs uppercase tracking-[0.22em] text-ink-500 hover:text-ink-700"
            label="j&rsquo;ai déjà un compte →"
            onClick={() => sendGAEvent("event", "landing_login_click", { position: "bottom" })}
          />
        </div>
      </section>
    </main>
  );
}
