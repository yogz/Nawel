/**
 * Règle de l'assignation admin sur un sondage non tranché : l'admin coche
 * les créneaux à la place d'un invité qui n'utilise pas l'app et lui a
 * donné ses dispos. Chaque créneau de la sortie reçoit donc un vote
 * tranché — coché = dispo, non coché = pas dispo — pour que
 * `pickTimeslotAction` le bascule en yes/no comme n'importe quel votant
 * (une abstention le laisserait bloqué en "interested"). Les ids hors de
 * la sortie sont ignorés : un formulaire forgé ne vote pas ailleurs.
 */
export function resolveAdminPollVotes(
  checkedIds: string[],
  outingSlotIds: string[]
): {
  response: "interested" | "no";
  votes: { timeslotId: string; available: boolean }[];
} {
  const checked = new Set(checkedIds);
  const votes = outingSlotIds.map((timeslotId) => ({
    timeslotId,
    available: checked.has(timeslotId),
  }));
  return { response: votes.some((v) => v.available) ? "interested" : "no", votes };
}
