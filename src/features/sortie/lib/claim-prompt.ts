// Trigger logic + cookie helpers pour la prompt InboxClaimPrompt sur la
// page lien-privé `/@<username>?k=<token>`. Pure fn pour le predicate
// (testable), I/O isolés derrière des fonctions cookies dédiées.

const DISMISS_COOKIE = "sortie_claim_dismiss";
const DISMISS_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours

/** Seuil mini de RSVP pour proposer la prompt. Pas le 1er RSVP : trop tôt,
 * casse le flow joyeux. Le 2ème = signal d'engagement réel. */
export const CLAIM_PROMPT_MIN_RSVPS = 2;

export const CLAIM_PROMPT_DISMISS_COOKIE = DISMISS_COOKIE;
export const CLAIM_PROMPT_DISMISS_TTL_SECONDS = DISMISS_TTL_SECONDS;

type ParticipantishForTrigger = {
  userId: string | null;
  anonEmail: string | null;
};

/**
 * Vrai quand l'invité matche les conditions pour voir la prompt :
 *   - ≥ N participant rows
 *   - aucune row n'a déjà un email (anonEmail) ni un userId — l'invité
 *     n'a jamais donné son email ni signé un magic-link silencieux. Si
 *     userId est set, le silent account existe → re-prompt = doublon.
 *
 * Le check `!isAuthenticated` reste à l'appelant (séparation de la
 * source : session vs DB).
 */
export function shouldShowClaimPrompt(
  participants: ParticipantishForTrigger[],
  minRsvps: number = CLAIM_PROMPT_MIN_RSVPS
): boolean {
  if (participants.length < minRsvps) {
    return false;
  }
  return participants.every((p) => p.userId === null && p.anonEmail === null);
}
