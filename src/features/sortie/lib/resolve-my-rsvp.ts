import type { MyParticipantWithSlots } from "@/features/sortie/queries/outing-queries";
import type { RsvpResponseAny } from "./rsvp-response";

export type ResolvedMyRsvp = {
  response: RsvpResponseAny;
  name: string;
  extraAdults: number;
  extraChildren: number;
  email: string | undefined;
  votedSlots: Date[];
};

export function resolveMyRsvp(
  p: MyParticipantWithSlots | undefined,
  loggedInName: string | null = null
): ResolvedMyRsvp | null {
  if (
    !p ||
    (p.response !== "yes" &&
      p.response !== "no" &&
      p.response !== "handle_own" &&
      p.response !== "interested")
  ) {
    return null;
  }
  return {
    response: p.response,
    name: p.anonName ?? loggedInName ?? "",
    extraAdults: p.extraAdults,
    extraChildren: p.extraChildren,
    email: p.anonEmail ?? undefined,
    votedSlots: p.votedSlots,
  };
}
