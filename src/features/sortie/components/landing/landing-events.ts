/**
 * Source de vérité pour le tracking Umami de la landing v2. Centraliser
 * évite les typos silencieuses qui casseraient la cible
 * `card-showcase visible / v2_view > 50%` en cas de coquille
 * sur un nom d'event ou un value de property.
 */

export const LANDING_EVENTS = {
  view: "landing_v2_view",
  sectionVisible: "landing_section_visible",
  ctaClick: "landing_cta_click",
  loginClick: "landing_login_click",
} as const;

export type LandingSection = "how-it-works" | "card-showcase" | "wall-of-vibes" | "vs-galere";
export type LandingPosition = "hero" | "bottom";
