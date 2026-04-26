import { describe, expect, it } from "vitest";
import { defaultStartTimeFor, VIBE_OPTIONS } from "./vibe-config";

describe("vibe-config / defaultStartTimeFor", () => {
  it("retourne 19:00 (autre) pour vibe null ou undefined", () => {
    expect(defaultStartTimeFor(null)).toBe("19:00");
    expect(defaultStartTimeFor(undefined)).toBe("19:00");
  });

  it("retourne 20:30 pour concert", () => {
    expect(defaultStartTimeFor("concert")).toBe("20:30");
  });

  it("retourne 14:00 pour expo (afternoon)", () => {
    expect(defaultStartTimeFor("expo")).toBe("14:00");
  });

  it("retourne 19:30 pour opera (commence plus tôt)", () => {
    expect(defaultStartTimeFor("opera")).toBe("19:30");
  });

  it("a une valeur définie pour chaque vibe du picker", () => {
    // Garde-fou : si on ajoute une vibe à VIBE_OPTIONS sans étendre le
    // mapping, ce test pète au lieu de retourner silencieusement
    // `undefined` (TS le rattraperait aussi, mais double sécurité).
    for (const opt of VIBE_OPTIONS) {
      expect(defaultStartTimeFor(opt.value)).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});
