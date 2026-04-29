import { describe, expect, it } from "vitest";
import { CLAIM_PROMPT_MIN_RSVPS, shouldShowClaimPrompt } from "./claim-prompt";

const cookieOnly = { userId: null, anonEmail: null };
const withEmail = { userId: null, anonEmail: "test@x.fr" };
const withUser = { userId: "u1", anonEmail: null };

describe("shouldShowClaimPrompt", () => {
  it("retourne false sous le seuil de RSVP", () => {
    expect(shouldShowClaimPrompt([])).toBe(false);
    expect(shouldShowClaimPrompt([cookieOnly])).toBe(false);
  });

  it("retourne true à exactement le seuil avec rows cookie-only", () => {
    const rows = Array(CLAIM_PROMPT_MIN_RSVPS).fill(cookieOnly);
    expect(shouldShowClaimPrompt(rows)).toBe(true);
  });

  it("retourne false si une row a déjà un anonEmail", () => {
    expect(shouldShowClaimPrompt([cookieOnly, withEmail])).toBe(false);
  });

  it("retourne false si une row a déjà un userId (silent account)", () => {
    expect(shouldShowClaimPrompt([cookieOnly, withUser])).toBe(false);
  });

  it("paramètre minRsvps custom", () => {
    expect(shouldShowClaimPrompt([cookieOnly], 1)).toBe(true);
    expect(shouldShowClaimPrompt([cookieOnly, cookieOnly, cookieOnly], 4)).toBe(false);
  });
});
