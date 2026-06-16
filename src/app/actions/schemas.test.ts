import { describe, expect, it } from "vitest";
import { createItemSchema, createPersonSchema } from "./schemas";

const base = { slug: "bbq", key: "k" };

describe("schemas — noms requis (anti-vide)", () => {
  it("rejette un nom de plat vide ou uniquement des espaces", () => {
    expect(createItemSchema.safeParse({ ...base, serviceId: 1, name: "" }).success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, serviceId: 1, name: "   " }).success).toBe(false);
  });

  it("rejette un nom de personne réduit à du vide après nettoyage (emoji-only)", () => {
    // sanitizeStrictText retire les emoji -> chaîne vide -> rejeté.
    expect(createPersonSchema.safeParse({ ...base, name: "🎉" }).success).toBe(false);
    expect(createPersonSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });

  it("accepte un nom valide", () => {
    expect(createItemSchema.safeParse({ ...base, serviceId: 1, name: "Tarte" }).success).toBe(true);
    expect(createPersonSchema.safeParse({ ...base, name: "Bob" }).success).toBe(true);
  });
});
