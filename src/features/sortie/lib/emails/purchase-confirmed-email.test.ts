import { describe, expect, it } from "vitest";
import { purchaseConfirmedEmail } from "./templates";

function email() {
  return purchaseConfirmedEmail({
    outingTitle: "Pilote",
    outingDate: new Date("2026-11-25T18:00:00.000Z"),
    buyerName: "Nicolas",
    debtorName: "Yves",
    amountCents: 2500,
    outingUrl: "https://sortie.colist.fr/pilote-JtLFTqLm",
    debtsUrl: "https://sortie.colist.fr/pilote-JtLFTqLm/dettes",
    methods: [],
  });
}

describe("purchaseConfirmedEmail", () => {
  it("annonce une place prise, pas une facture", () => {
    expect(email().subject).toMatch(/^Nicolas a pris ta place pour Pilote — 25,00\s€$/);
  });

  it("dit que la place est pour la personne et comment rembourser", () => {
    const { html } = email();
    expect(html).toContain("la tienne comprise");
    expect(html).toContain("Pour rembourser Nicolas");
    expect(html).toContain("donne celui où tu reçois ce message");
    expect(html).toContain("Ce n&rsquo;est pas toi ? Préviens Nicolas.");
  });
});
