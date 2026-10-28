import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CONFIRM_TOKEN_TTL_MS,
  checkConfirmToken,
  hashConfirmToken,
  newConfirmToken,
} from "./confirm-token";

const NOW = new Date("2026-10-28T10:00:00.000Z");

describe("newConfirmToken", () => {
  it("génère un jeton aléatoire, stocké haché, valable 15 minutes", () => {
    const a = newConfirmToken(NOW);
    const b = newConfirmToken(NOW);
    expect(a.token).not.toBe(b.token);
    // 32 octets en base64url = 43 caractères.
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.tokenHash).toBe(createHash("sha256").update(a.token).digest("hex"));
    expect(a.tokenHash).toHaveLength(64);
    expect(a.tokenHash).not.toContain(a.token);
    expect(a.expiresAt.getTime() - NOW.getTime()).toBe(15 * 60 * 1000);
    expect(CONFIRM_TOKEN_TTL_MS).toBe(15 * 60 * 1000);
  });

  it("le hachage du jeton reçu retrouve la ligne", () => {
    const t = newConfirmToken(NOW);
    expect(hashConfirmToken(t.token)).toBe(t.tokenHash);
  });
});

describe("checkConfirmToken", () => {
  const t = newConfirmToken(NOW);
  const pending = {
    userId: "u1",
    confirmTokenHash: t.tokenHash,
    confirmTokenExpiresAt: t.expiresAt,
    confirmedAt: null,
  };

  it("accepte un jeton valide, du bon compte, dans les temps", () => {
    expect(checkConfirmToken({ row: pending, sessionUserId: "u1", now: NOW })).toEqual({
      ok: true,
    });
  });

  it("refuse un jeton inconnu", () => {
    expect(checkConfirmToken({ row: undefined, sessionUserId: "u1", now: NOW })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("refuse un jeton expiré", () => {
    const later = new Date(t.expiresAt.getTime() + 1);
    expect(checkConfirmToken({ row: pending, sessionUserId: "u1", now: later })).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(checkConfirmToken({ row: pending, sessionUserId: "u1", now: t.expiresAt })).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("refuse un jeton déjà utilisé", () => {
    expect(
      checkConfirmToken({
        row: { ...pending, confirmedAt: NOW },
        sessionUserId: "u1",
        now: NOW,
      })
    ).toEqual({ ok: false, reason: "used" });
    expect(
      checkConfirmToken({
        row: { ...pending, confirmTokenHash: null, confirmTokenExpiresAt: null },
        sessionUserId: "u1",
        now: NOW,
      })
    ).toEqual({ ok: false, reason: "used" });
  });

  it("refuse le jeton d'un autre compte, ou sans session", () => {
    expect(checkConfirmToken({ row: pending, sessionUserId: "u2", now: NOW })).toEqual({
      ok: false,
      reason: "other-account",
    });
    expect(checkConfirmToken({ row: pending, sessionUserId: null, now: NOW })).toEqual({
      ok: false,
      reason: "other-account",
    });
  });
});
