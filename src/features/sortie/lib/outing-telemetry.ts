"use client";

import { sendGAEvent } from "@/lib/umami";
import { getDeviceLabel } from "./device-label";

/**
 * Télémétrie de la page sortie publique. Couvre le funnel post-création :
 * un visiteur arrive via un lien partagé → consulte → RSVP / partage à
 * son tour. Sans ces events, impossible de mesurer la viralité (K-factor),
 * la qualité d'un canal de partage, ou de détecter qu'une sheet RSVP est
 * cassée (vues hautes mais 0 RSVP).
 *
 * Tous les events partagent le préfixe `outing_` pour filtrage simple
 * côté Umami. Ne portent aucun PII : pas de slug, pas de titre, pas de
 * shortId — uniquement des dimensions agrégeables (mode, is_creator,
 * channel, response).
 */

type Payload = Record<string, string | number | boolean | undefined>;

type OutingEventName = "outing_viewed" | "outing_share_clicked" | "outing_rsvp_set";

function track(name: OutingEventName, payload?: Payload) {
  sendGAEvent("event", name, payload);
}

/**
 * Vue d'une page sortie publique. Le `source` distingue d'où vient le
 * visiteur (lien partagé direct, propre app interne, etc.) — calculé
 * côté client via `document.referrer`.
 */
export function trackOutingViewed(params: {
  mode: "fixed" | "vote";
  isCreator: boolean;
  isLoggedIn: boolean;
  hasResponded: boolean;
  source: "share" | "internal" | "direct";
}) {
  track("outing_viewed", {
    mode: params.mode,
    is_creator: params.isCreator,
    is_logged_in: params.isLoggedIn,
    has_responded: params.hasResponded,
    source: params.source,
    // Comble l'angle mort mobile vs desktop §9.1 du rapport audit. Lu
    // par `getOutingViewedDeviceBreakdown` côté dashboard.
    device: getDeviceLabel(),
  });
}

/**
 * Partage d'une sortie. `channel` = méthode utilisée par l'user :
 *   - whatsapp     — clic sur le bouton WhatsApp pré-rempli
 *   - native       — Web Share API (iOS / Android / Edge)
 *   - copy         — copier le lien (fallback Firefox desktop)
 *   - fallback_prompt — le `window.prompt` ultime quand clipboard refuse
 *
 * `placement` situe le bouton dans la page : `hero` = banner post-create
 * juste après publication, `actions_row` = la rangée persistante.
 */
export function trackOutingShareClicked(params: {
  channel: "whatsapp" | "native" | "copy" | "fallback_prompt";
  placement: "hero" | "actions_row";
}) {
  track("outing_share_clicked", {
    channel: params.channel,
    placement: params.placement,
  });
}

/**
 * Soumission d'une réponse RSVP — émis APRÈS commit serveur réussi
 * pour ne pas compter les abandons de sheet. Le `delta` indique si
 * c'est une 1ʳᵉ réponse (`new`) ou un changement (`switched`) — utile
 * pour mesurer l'instabilité d'un yes/no/yes.
 */
export function trackOutingRsvpSet(params: {
  response: "yes" | "no" | "handle_own";
  delta: "new" | "switched";
  isLoggedIn: boolean;
  // Le visiteur a fourni un email lors du RSVP — signal d'engagement
  // (et input de croissance pour la conversion auth post-RSVP).
  hasEmail: boolean;
}) {
  track("outing_rsvp_set", {
    response: params.response,
    delta: params.delta,
    is_logged_in: params.isLoggedIn,
    has_email: params.hasEmail,
  });
}

// Note : `outing_ticket_clicked` et `outing_ics_downloaded` sont émis
// directement via les attributs HTML natifs Umami `data-umami-event="…"`
// dans `outing-hero.tsx` (lignes 113 et 128). Inutile de dupliquer en
// helpers JS — les helpers précédents étaient morts (jamais appelés
// alors que les events partaient quand même côté browser via Umami).
