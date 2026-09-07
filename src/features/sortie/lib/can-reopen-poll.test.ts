import { describe, expect, it } from "vitest";
import { canReopenPoll, type CanReopenPollArgs } from "./can-reopen-poll";

const FROZEN_NOW = new Date("2026-05-06T12:17:00.000Z");
const D_PLUS = (hours: number) => new Date(FROZEN_NOW.getTime() + hours * 3_600_000);

// Sortie par défaut : un sondage tranché, encore ouvert au vote, sans achat
// — le seul cas où la réouverture est légitime.
function args(overrides: Partial<CanReopenPollArgs> = {}): CanReopenPollArgs {
  return {
    mode: "vote",
    status: "open",
    chosenTimeslotId: "ts-1",
    deadlineAt: D_PLUS(24),
    now: FROZEN_NOW,
    ...overrides,
  };
}

describe("canReopenPoll", () => {
  it("autorise un sondage tranché, sans achat, avant la deadline", () => {
    expect(canReopenPoll(args())).toEqual({ ok: true });
  });

  it("autorise encore en awaiting_purchase — personne n'a acheté", () => {
    expect(canReopenPoll(args({ status: "awaiting_purchase" }))).toEqual({ ok: true });
  });

  // Le bug d'origine (incident dMekC3qK) : sortie payée + deadline passée.
  // La réouverture effaçait la date, sortait l'événement du flux iCal et
  // désarmait le rappel J-1, sans rendre le vote à personne.
  it("refuse la réouverture d'une sortie déjà payée", () => {
    const res = canReopenPoll(args({ status: "purchased" }));
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("tickets-bought");
  });

  it("refuse aussi en past (billets pris, sortie passée)", () => {
    const res = canReopenPoll(args({ status: "past" }));
    expect(res.ok === false && res.reason).toBe("tickets-bought");
  });

  it("refuse quand la deadline est passée — plus personne ne peut voter", () => {
    const res = canReopenPoll(args({ deadlineAt: D_PLUS(-1) }));
    expect(res.ok === false && res.reason).toBe("votes-closed");
  });

  it("refuse à la seconde exacte de la deadline (bord inclus)", () => {
    const res = canReopenPoll(args({ deadlineAt: FROZEN_NOW }));
    expect(res.ok === false && res.reason).toBe("votes-closed");
  });

  // Les deux refus "réels" doivent enseigner la porte de sortie, sinon
  // l'organisateur reste coincé sans savoir quoi faire.
  it("renvoie un message qui pointe vers Modifier sur les deux refus réels", () => {
    for (const overrides of [{ status: "purchased" as const }, { deadlineAt: D_PLUS(-1) }]) {
      const res = canReopenPoll(args(overrides));
      expect(res.ok === false && res.message).toMatch(/Modifier/);
    }
  });

  it("refuse une sortie annulée avant de parler d'achat", () => {
    const res = canReopenPoll(args({ status: "cancelled" }));
    expect(res.ok === false && res.reason).toBe("cancelled");
  });

  it("refuse un sondage déjà ouvert", () => {
    const res = canReopenPoll(args({ chosenTimeslotId: null }));
    expect(res.ok === false && res.reason).toBe("already-open");
  });

  it("refuse une sortie en mode fixed", () => {
    const res = canReopenPoll(args({ mode: "fixed" }));
    expect(res.ok === false && res.reason).toBe("not-a-poll");
  });

  it("prend `now` par défaut quand il n'est pas fourni", () => {
    const res = canReopenPoll({
      mode: "vote",
      status: "open",
      chosenTimeslotId: "ts-1",
      deadlineAt: new Date(Date.now() - 1000),
    });
    expect(res.ok === false && res.reason).toBe("votes-closed");
  });
});
