import { LandingBottomCta } from "./landing-bottom-cta";
import { LandingJsonLd } from "./landing-json-ld";
import { LandingViewBeacon } from "./landing-view-beacon";
import { PublicHero } from "./public-hero";
import { SectionCardShowcase } from "./section-card-showcase";
import { SectionHowItWorks } from "./section-how-it-works";
import { SectionVsGalere } from "./section-vs-galere";
import { SectionWallOfVibes } from "./section-wall-of-vibes";

/**
 * Landing publique pour visiteur unauth fresh. Le branching `AnonInbox`
 * (returning anon avec cookie token + RSVP) reste prioritaire en amont —
 * cette landing ne s'affiche que sur le cas blind.
 *
 * Server Component : les sections sont aussi RSC (markup statique +
 * `<RevealOnScroll>` client autonome pour l'IntersectionObserver). Les
 * bouts qui *ont* besoin de client (pageview analytics, login-link
 * onClick) sont isolés dans <LandingViewBeacon /> et <LandingBottomCta />.
 */
export function LandingV2() {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-2xl flex-col pb-16">
      <LandingViewBeacon />
      <LandingJsonLd />
      <PublicHero />
      <SectionWallOfVibes />
      <SectionHowItWorks />
      <SectionCardShowcase />
      <SectionVsGalere />
      <LandingBottomCta />
    </main>
  );
}
