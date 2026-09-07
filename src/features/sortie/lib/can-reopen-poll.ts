// Règle unique qui décide si un sondage peut être rouvert. Extraite en
// fonction pure pour que le bouton (`PollSection`) et la Server Action
// (`reopenPollAction`) posent EXACTEMENT la même condition — avant, les
// deux étaient écrites séparément et le bouton restait affiché sur des
// sorties que l'action aurait dû refuser.
//
// Incident dMekC3qK (mai 2026) : une sortie déjà payée a été rouverte
// après la clôture des votes. La réouverture a remis `fixed_datetime` et
// `chosen_timeslot_id` à NULL, ce qui a sorti l'événement canonique du
// flux iCal (donc supprimé des agendas abonnés), désarmé le rappel J-1 et
// masqué le champ date dans `/modifier`. Et elle n'a rien rouvert du
// tout : `upsertVoteAction` refuse tout vote passé la deadline, donc le
// geste ne pouvait produire qu'une perte.

// Sous-ensemble du schéma `outingStatus` — on ne type que ce qu'on teste,
// comme dans `pending-actions.ts`.
type OutingStatus =
  | "open"
  | "awaiting_purchase"
  | "stale_purchase"
  | "purchased"
  | "past"
  | "settled"
  | "cancelled";

/**
 * Statuts qui autorisent la réouverture : ceux où personne n'a encore
 * acheté. Formulé en liste blanche plutôt qu'en `!== "purchased"` pour
 * couvrir `past`, et gratuitement `stale_purchase` / `settled` le jour où
 * quelqu'un les écrira (aucun code ne les pose aujourd'hui).
 *
 * On teste le statut et non l'existence d'une row `purchases` :
 * `scripts/db/mark-outing-purchased.ts` pose `purchased` sans créer de
 * row (billets pris hors-app), et une garde par `purchases` laisserait
 * passer ce cas.
 */
const REOPENABLE_STATUSES: ReadonlySet<OutingStatus> = new Set(["open", "awaiting_purchase"]);

export type ReopenPollRefusal =
  | "not-a-poll"
  | "already-open"
  | "cancelled"
  | "tickets-bought"
  | "votes-closed";

export type CanReopenPollArgs = {
  mode: "fixed" | "vote";
  status: OutingStatus;
  chosenTimeslotId: string | null;
  deadlineAt: Date;
  now?: Date;
};

export type CanReopenPollResult =
  | { ok: true }
  | { ok: false; reason: ReopenPollRefusal; message: string };

/**
 * Messages de refus. Ils sont rendus tels quels à l'organisateur, donc ils
 * doivent enseigner la suite plutôt que constater l'échec : les deux refus
 * "réels" (billets pris, votes clos) ont tous les deux une porte de sortie
 * par `/modifier`, et c'est le message qui la rend devinable.
 */
const REFUSAL_MESSAGES: Record<ReopenPollRefusal, string> = {
  "not-a-poll": "Cette sortie n'est pas en mode sondage.",
  "already-open": "Le sondage est déjà ouvert.",
  cancelled: "Cette sortie est annulée.",
  "tickets-bought":
    "Les billets sont déjà pris — la date ne peut plus être remise au vote. Passe par Modifier pour la corriger.",
  "votes-closed":
    "La date limite est passée : plus personne ne peut voter. Repousse-la d'abord depuis Modifier, puis rouvre le sondage.",
};

export function canReopenPoll({
  mode,
  status,
  chosenTimeslotId,
  deadlineAt,
  now = new Date(),
}: CanReopenPollArgs): CanReopenPollResult {
  const refuse = (reason: ReopenPollRefusal): CanReopenPollResult => ({
    ok: false,
    reason,
    message: REFUSAL_MESSAGES[reason],
  });

  if (mode !== "vote") {
    return refuse("not-a-poll");
  }
  if (!chosenTimeslotId) {
    return refuse("already-open");
  }
  if (status === "cancelled") {
    return refuse("cancelled");
  }
  if (!REOPENABLE_STATUSES.has(status)) {
    return refuse("tickets-bought");
  }
  // Rouvrir après la deadline est inopérant : la feuille de vote n'est plus
  // rendue (`page.tsx`) et `upsertVoteAction` refuse côté serveur. Le seul
  // effet observable serait d'effacer la date — on refuse, en donnant
  // l'ordre qui marche (repousser la deadline, puis rouvrir).
  if (deadlineAt <= now) {
    return refuse("votes-closed");
  }
  return { ok: true };
}
