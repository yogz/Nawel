"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@/lib/umami";
import { LoginLink } from "@/features/sortie/components/login-link";
import { LandingCtaButton } from "./landing-cta-button";
import { LANDING_EVENTS } from "./landing-events";
import { LandingJsonLd } from "./landing-json-ld";
import { PublicHero } from "./public-hero";
import { SectionCardShowcase } from "./section-card-showcase";
import { SectionHowItWorks } from "./section-how-it-works";
import { SectionVsGalere } from "./section-vs-galere";
import { SectionWallOfVibes } from "./section-wall-of-vibes";

/**
 * Landing publique pour visiteur unauth fresh. Le branching `AnonInbox`
 * (returning anon avec cookie token + RSVP) reste prioritaire en amont —
 * cette landing ne s'affiche que sur le cas blind.
 */
export function LandingV2() {
  useEffect(() => {
    sendGAEvent("event", LANDING_EVENTS.view);
  }, []);

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-2xl flex-col pb-16">
      <LandingJsonLd />
      <PublicHero />
      <SectionWallOfVibes />
      <SectionHowItWorks />
      <SectionCardShowcase />
      <SectionVsGalere />

      <section className="mt-16 px-6 text-center sm:mt-24">
        <LandingCtaButton position="bottom" fullWidthOnMobile />
        <div className="mt-5">
          <LoginLink
            className="font-mono text-xs uppercase tracking-[0.22em] text-ink-500 hover:text-ink-700"
            label="j&rsquo;ai déjà un compte →"
            onClick={() => sendGAEvent("event", LANDING_EVENTS.loginClick, { position: "bottom" })}
          />
        </div>
      </section>
    </main>
  );
}
