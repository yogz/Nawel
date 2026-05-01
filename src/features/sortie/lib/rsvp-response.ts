import type { rsvpResponse } from "@drizzle/sortie-schema";

// `interested` = a voté en mode sondage sans encore avoir une date fixée.
// Le mode fixed n'expose que yes/no/handle_own — RsvpResponseFixed est la
// version restreinte pour les flows sheet/RSVP, RsvpResponseAny couvre
// toutes les rows lues depuis la DB (mode vote inclus).
export type RsvpResponseAny = (typeof rsvpResponse.enumValues)[number];
export type RsvpResponseFixed = Exclude<RsvpResponseAny, "interested">;

export function isFixedRsvp<T extends { response: RsvpResponseAny }>(
  r: T
): r is T & { response: RsvpResponseFixed } {
  return r.response !== "interested";
}

/**
 * Buckets ouverts par l'agenda : projection des `RsvpResponseAny` + flag
 * créateur en 5 statuts UX. Les filtres et les badges partagent ce
 * mapping pour rester alignés (un toggle "yes" exclut/inclut les mêmes
 * items que ceux portant le badge "tu y vas").
 */
export type AgendaRsvpBucket = "yes" | "maybe" | "no" | "creator" | "pending";

export function getAgendaRsvpBucket(item: {
  myResponse: RsvpResponseAny | null;
  isCreator: boolean;
}): AgendaRsvpBucket {
  if (item.myResponse === "yes" || item.myResponse === "handle_own") {
    return "yes";
  }
  if (item.myResponse === "interested") {
    return "maybe";
  }
  if (item.myResponse === "no") {
    return "no";
  }
  if (item.isCreator) {
    return "creator";
  }
  return "pending";
}
