"use client";

import { sendGAEvent } from "@/lib/umami";

/**
 * Télémétrie du wizard de création de sortie. Tous les events partagent
 * le préfixe `wizard_` pour filtrage simple côté Umami. Les helpers ne
 * portent aucun state — le hook `useWizardTelemetry` orchestre les
 * timings (step durations, paste→publish) via des refs.
 *
 * Convention payload : on s'autorise les champs scalaires plats que le
 * type `UmamiEventData` accepte. `undefined` est filtré par sendGAEvent.
 */

type WizardEventName =
  | "wizard_step_entered"
  | "wizard_step_exited"
  | "wizard_paste_submitted"
  | "wizard_suggestion_picked"
  | "wizard_gemini_started"
  | "wizard_gemini_completed"
  | "wizard_publish_started"
  | "wizard_publish_succeeded"
  | "wizard_publish_failed"
  | "wizard_abandoned";

type Payload = Record<string, string | number | boolean | undefined>;

function track(name: WizardEventName, payload?: Payload) {
  sendGAEvent("event", name, payload);
}

export function trackWizardStepEntered(step: string, fromStep: string | null) {
  track("wizard_step_entered", { step, from_step: fromStep ?? "(initial)" });
}

export function trackWizardStepExited(
  step: string,
  durationMs: number,
  outcome: "advanced" | "back" | "abandoned"
) {
  track("wizard_step_exited", { step, duration_ms: Math.round(durationMs), outcome });
}

export function trackWizardPasteSubmitted(kind: "url" | "text", hasVibe: boolean) {
  track("wizard_paste_submitted", { kind, has_vibe: hasVibe });
}

/**
 * Source d'une suggestion sélectionnée. `tm` = Ticketmaster, `oa` =
 * OpenAgenda (cf. `event-providers.ts`), `gemini` = card de fallback IA.
 */
export function trackWizardSuggestionPicked(source: "tm" | "oa" | "gemini") {
  track("wizard_suggestion_picked", { source });
}

/**
 * Trigger de Gemini : `auto` = chaîné automatiquement après échec OG
 * (comportement actuel), `optin` = bouton "Chercher pour moi" cliqué
 * explicitement (PR2a), `bg` = lancé en background sur texte libre
 * sans bloquer (PR2b).
 */
export function trackWizardGeminiStarted(trigger: "auto" | "optin" | "bg") {
  track("wizard_gemini_started", { trigger });
}

export function trackWizardGeminiCompleted(
  outcome: "found" | "not_found" | "cancelled" | "error",
  durationMs: number
) {
  track("wizard_gemini_completed", { outcome, duration_ms: Math.round(durationMs) });
}

export function trackWizardPublishStarted(mode: "fixed" | "vote", isLoggedIn: boolean) {
  track("wizard_publish_started", { mode, is_logged_in: isLoggedIn });
}

/**
 * Métrique nord : `paste_to_publish_ms` = temps entre la 1ʳᵉ submission
 * du paste step et le succès du publish. Mesuré via une ref dans le
 * hook. `null` si le user a publié sans passer par paste (impossible
 * en pratique, mais on garde le champ optionnel pour robustesse).
 */
export function trackWizardPublishSucceeded(params: {
  mode: "fixed" | "vote";
  isLoggedIn: boolean;
  hasEmail: boolean;
  hasVenue: boolean;
  hasTicketUrl: boolean;
  hasHeroImage: boolean;
  pasteToPublishMs: number | null;
}) {
  track("wizard_publish_succeeded", {
    mode: params.mode,
    is_logged_in: params.isLoggedIn,
    has_email: params.hasEmail,
    has_venue: params.hasVenue,
    has_ticket_url: params.hasTicketUrl,
    has_hero_image: params.hasHeroImage,
    paste_to_publish_ms:
      params.pasteToPublishMs !== null ? Math.round(params.pasteToPublishMs) : undefined,
  });
}

export function trackWizardPublishFailed(reason: "validation" | "server" | "network") {
  track("wizard_publish_failed", { reason });
}

export function trackWizardAbandoned(lastStep: string, totalDurationMs: number) {
  track("wizard_abandoned", {
    last_step: lastStep,
    total_duration_ms: Math.round(totalDurationMs),
  });
}
