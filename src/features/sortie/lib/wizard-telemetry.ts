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
  | "wizard_step_paste_entered"
  | "wizard_step_title_entered"
  | "wizard_step_confirm_entered"
  | "wizard_step_date_entered"
  | "wizard_step_venue_entered"
  | "wizard_step_name_entered"
  | "wizard_step_commit_entered"
  | "wizard_step_entered_other"
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

// Mapping step → nom d'event distinct. Les funnels Umami free ne
// peuvent pas filtrer sur les properties (testé 2026-04-26 : pas de
// 3ᵉ dropdown), donc chaque step a son event nommé pour pouvoir
// servir de step de funnel. `_other` est un fallback safe pour les
// steps qu'on ajouterait sans mettre à jour ce mapping (TS rattrape
// déjà mais double sécu).
const STEP_EVENT_NAMES: Record<string, WizardEventName> = {
  paste: "wizard_step_paste_entered",
  title: "wizard_step_title_entered",
  confirm: "wizard_step_confirm_entered",
  date: "wizard_step_date_entered",
  venue: "wizard_step_venue_entered",
  name: "wizard_step_name_entered",
  commit: "wizard_step_commit_entered",
};

export function trackWizardStepEntered(step: string, fromStep: string | null) {
  const eventName = STEP_EVENT_NAMES[step] ?? "wizard_step_entered_other";
  track(eventName, { step, from_step: fromStep ?? "(initial)" });
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
 * Buckets discrets pour `paste_to_publish_ms`. Émis EN PLUS de la
 * valeur brute, pour éviter d'exploser la cardinalité côté
 * `event-data/values` (1 ligne par publish si on lit la propriété
 * continue) et permettre une lecture instantanée sur le dashboard.
 *
 * Bornes choisies pour matcher l'expérience utilisateur :
 *   - <5s  → wizard "snap" (gemini auto-rempli, user en flow)
 *   - 5-15s → tempo normal (un user attentif qui lit ce qui est rempli)
 *   - 15-60s → corrections / hésitations
 *   - >60s → soit user multitâche, soit wizard galère.
 */
export function pasteToPublishBucket(ms: number): "lt5s" | "5-15s" | "15-60s" | "gt60s" {
  if (ms < 5_000) {
    return "lt5s";
  }
  if (ms < 15_000) {
    return "5-15s";
  }
  if (ms < 60_000) {
    return "15-60s";
  }
  return "gt60s";
}

/**
 * Métrique nord : `paste_to_publish_ms` = temps entre la 1ʳᵉ submission
 * du paste step et le succès du publish. Mesuré via une ref dans le
 * hook. `null` si le user a publié sans passer par paste (impossible
 * en pratique, mais on garde le champ optionnel pour robustesse).
 *
 * Émet aussi `paste_to_publish_bucket` (discret) à côté du `_ms`
 * (continu) — les 2 sont nécessaires : le bucket pour les ratios
 * "% snap / % long" sans perdre le ms pour le calcul de médiane fine.
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
  const ms = params.pasteToPublishMs;
  track("wizard_publish_succeeded", {
    mode: params.mode,
    is_logged_in: params.isLoggedIn,
    has_email: params.hasEmail,
    has_venue: params.hasVenue,
    has_ticket_url: params.hasTicketUrl,
    has_hero_image: params.hasHeroImage,
    paste_to_publish_ms: ms !== null ? Math.round(ms) : undefined,
    paste_to_publish_bucket: ms !== null ? pasteToPublishBucket(ms) : undefined,
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
