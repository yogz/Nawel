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
