import { describe, expect, it } from "vitest";
import { canReuseExistingSilentUser } from "./silent-user";

describe("canReuseExistingSilentUser", () => {
  // Cas nominal : compte créé silencieusement à un précédent RSVP
  // (typique d'un visiteur qui n'a pas encore claim) → on rattache
  // l'invité au même userId pour qu'au prochain magic-link signin tous
  // ses RSVPs cookie-only le rejoignent en une fois.
  it("autorise un user silent (non vérifié, sans account row)", () => {
    expect(
      canReuseExistingSilentUser({
        banned: false,
        emailVerified: false,
        hasAccountRow: false,
      })
    ).toBe(true);
  });

  // Cœur de la garde de sécurité : un compte vérifié appartient à
  // quelqu'un qui a déjà prouvé son email — impossible d'y rattacher
  // un invité sur la base d'un email tapé librement.
  it("refuse un compte vérifié", () => {
    expect(
      canReuseExistingSilentUser({
        banned: false,
        emailVerified: true,
        hasAccountRow: false,
      })
    ).toBe(false);
  });

  // Cas Better Auth rare : un compte non-vérifié peut avoir une row
  // `account` (admin insertion, OAuth pré-verif). La présence d'une
  // méthode de signin établie fait de lui un compte "actif" pour la
  // règle, indépendamment d'emailVerified.
  it("refuse un compte avec une row account même si non vérifié", () => {
    expect(
      canReuseExistingSilentUser({
        banned: false,
        emailVerified: false,
        hasAccountRow: true,
      })
    ).toBe(false);
  });

  it("refuse un compte banni", () => {
    expect(
      canReuseExistingSilentUser({
        banned: true,
        emailVerified: false,
        hasAccountRow: false,
      })
    ).toBe(false);
  });

  // `banned: null` est l'état par défaut côté Better Auth (colonne
  // nullable) — on traite null comme "pas banni" pour ne pas refuser
  // tous les users juste parce que la colonne n'a jamais été touchée.
  it("traite banned=null comme non-banni", () => {
    expect(
      canReuseExistingSilentUser({
        banned: null,
        emailVerified: false,
        hasAccountRow: false,
      })
    ).toBe(true);
  });
});
