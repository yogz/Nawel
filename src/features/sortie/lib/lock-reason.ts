import { CalendarCheck, Check, Ticket, type LucideIcon } from "lucide-react";

/**
 * Précédence temporelle pour le badge "verrouillé" affiché sur les
 * thumbnails de sortie. Une sortie progresse naturellement :
 * deadline passée → créneau tranché (mode vote) → places prises. Le
 * glyph affiché reflète l'étape la plus avancée — un purchased a
 * forcément deadline passée + vote tranché si applicable, mais on
 * n'affiche que le ticket.
 *
 * Renvoie null quand aucune des 3 conditions n'est atteinte (sortie
 * encore en flux : RSVP ouverts, créneau pas tranché, achat à venir).
 */
export type LockReason = "purchased" | "vote-tranched" | "deadline-passed";

type Outingish = {
  startsAt: Date | null;
  deadlineAt: Date;
  status: string;
  mode: "fixed" | "vote";
};

export function resolveLockReason(o: Outingish, now: Date = new Date()): LockReason | null {
  if (o.status === "purchased") {
    return "purchased";
  }
  if (o.mode === "vote" && o.startsAt !== null) {
    return "vote-tranched";
  }
  if (o.deadlineAt.getTime() < now.getTime()) {
    return "deadline-passed";
  }
  return null;
}

export const LOCK_GLYPH: Record<LockReason, LucideIcon> = {
  purchased: Ticket,
  "vote-tranched": CalendarCheck,
  "deadline-passed": Check,
};
