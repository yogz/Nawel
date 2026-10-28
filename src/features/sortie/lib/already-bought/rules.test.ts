import { describe, expect, it } from "vitest";
import { acceptsResponses, resolveAlreadyBoughtCreation } from "./rules";

const NOW = new Date("2026-10-28T10:00:00.000Z");
const FUTURE = new Date("2026-11-25T18:00:00.000Z");

describe("resolveAlreadyBoughtCreation", () => {
  it("laisse une sortie normale telle quelle quand l'option n'est pas demandée", () => {
    expect(
      resolveAlreadyBoughtCreation({
        requested: false,
        sessionUserId: null,
        mode: "fixed",
        startsAt: FUTURE,
        now: NOW,
      })
    ).toEqual({ ok: true, alreadyBought: false });
  });

  it("refuse un créateur non connecté (formulaire forgé)", () => {
    expect(
      resolveAlreadyBoughtCreation({
        requested: true,
        sessionUserId: null,
        mode: "fixed",
        startsAt: FUTURE,
        now: NOW,
      })
    ).toEqual({
      ok: false,
      message: "Connecte-toi pour créer une sortie dont tu as déjà les billets.",
    });
  });

  it("ignore l'option pour un sondage", () => {
    expect(
      resolveAlreadyBoughtCreation({
        requested: true,
        sessionUserId: "u1",
        mode: "vote",
        startsAt: null,
        now: NOW,
      })
    ).toEqual({ ok: true, alreadyBought: false });
  });

  it("refuse une date passée ou absente", () => {
    for (const startsAt of [null, new Date("2026-10-27T18:00:00.000Z")]) {
      expect(
        resolveAlreadyBoughtCreation({
          requested: true,
          sessionUserId: "u1",
          mode: "fixed",
          startsAt,
          now: NOW,
        })
      ).toEqual({ ok: false, message: "La date doit être à venir." });
    }
  });

  it("accepte un organisateur connecté, date fixe à venir", () => {
    expect(
      resolveAlreadyBoughtCreation({
        requested: true,
        sessionUserId: "u1",
        mode: "fixed",
        startsAt: FUTURE,
        now: NOW,
      })
    ).toEqual({ ok: true, alreadyBought: true });
  });
});

describe("acceptsResponses", () => {
  it("refuse toujours les réponses sur une sortie « billets déjà pris »", () => {
    expect(acceptsResponses({ alreadyBought: true, status: "open", deadlineAt: FUTURE }, NOW)).toBe(
      false
    );
  });

  it("garde la règle existante pour les autres sorties", () => {
    const past = new Date("2026-10-01T00:00:00.000Z");
    expect(acceptsResponses({ alreadyBought: false, status: "open", deadlineAt: past }, NOW)).toBe(
      true
    );
    expect(
      acceptsResponses({ alreadyBought: false, status: "awaiting_purchase", deadlineAt: past }, NOW)
    ).toBe(false);
    expect(
      acceptsResponses(
        { alreadyBought: false, status: "awaiting_purchase", deadlineAt: FUTURE },
        NOW
      )
    ).toBe(true);
  });
});
