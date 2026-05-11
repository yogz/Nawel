"use client";

import { sendGAEvent } from "@/lib/umami";
import { LoginLink } from "@/features/sortie/components/login-link";
import { LandingCtaButton } from "./landing-cta-button";
import { LANDING_EVENTS } from "./landing-events";

/**
 * Bloc CTA bottom de la landing — extrait dans un composant client
 * isolé pour que LandingV2 puisse rester RSC (le `onClick` du
 * LoginLink est une callback non-sérialisable depuis un Server
 * Component).
 */
export function LandingBottomCta() {
  return (
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
  );
}
