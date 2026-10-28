/**
 * Règles pures des sorties « billets déjà pris » (organisateur qui a déjà
 * acheté et sait qui vient). Cf.
 * docs/superpowers/specs/2026-10-28-sortie-already-bought-design.md §5 bis.
 *
 * Sécurité : la fonctionnalité exige un compte réellement connecté
 * (`session.user`). Un créateur anonyme qui saisit un e-mail peut hériter
 * du compte silencieux de quelqu'un d'autre (`canReuseExistingSilentUser`),
 * il ne doit donc jamais pouvoir agir « au nom » de ce compte.
 */

export type CreationDecision =
  | { ok: true; alreadyBought: boolean }
  | { ok: false; message: string };

export function resolveAlreadyBoughtCreation(a: {
  requested: boolean;
  sessionUserId: string | null;
  mode: "fixed" | "vote";
  startsAt: Date | null;
  now: Date;
}): CreationDecision {
  // Un sondage n'a pas encore de date : l'option n'a pas de sens, on
  // l'ignore (brouillon restauré puis passé en sondage).
  if (!a.requested || a.mode !== "fixed") {
    return { ok: true, alreadyBought: false };
  }
  if (!a.sessionUserId) {
    return {
      ok: false,
      message: "Connecte-toi pour créer une sortie dont tu as déjà les billets.",
    };
  }
  if (!a.startsAt || a.startsAt.getTime() <= a.now.getTime()) {
    return { ok: false, message: "La date doit être à venir." };
  }
  return { ok: true, alreadyBought: true };
}

/**
 * La sortie accepte-t-elle encore des réponses (RSVP / votes) ? Une sortie
 * « billets déjà pris » jamais ; sinon la règle historique : fermé une fois
 * la deadline passée, sauf tant que le sweeper n'a pas basculé `open`.
 */
export function acceptsResponses(
  o: { alreadyBought: boolean; status: string; deadlineAt: Date },
  now: Date
): boolean {
  if (o.alreadyBought) {
    return false;
  }
  return !(o.deadlineAt < now && o.status !== "open");
}

/** Modifier une sortie « billets déjà pris » ne touche pas à sa deadline (réponses jamais rouvertes). */
export function editKeepsDeadline(o: { alreadyBought: boolean }): boolean {
  return o.alreadyBought;
}

/**
 * E-mail « sortie modifiée » : pas avant l'achat pour une sortie « billets
 * déjà pris » — les participants ajoutés ne doivent recevoir qu'un e-mail,
 * celui de l'achat avec leur part.
 */
export function editNotifiesParticipants(o: {
  alreadyBought: boolean;
  hasPurchase: boolean;
}): boolean {
  return !o.alreadyBought || o.hasPurchase;
}
