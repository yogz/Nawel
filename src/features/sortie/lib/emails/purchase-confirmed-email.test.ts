import { describe, expect, it } from "vitest";
import { purchaseConfirmedEmail } from "./templates";

function email(methods: Parameters<typeof purchaseConfirmedEmail>[0]["methods"] = []) {
  return purchaseConfirmedEmail({
    outingTitle: "Pilote",
    outingDate: new Date("2026-11-25T18:00:00.000Z"),
    buyerName: "Nicolas",
    debtorName: "Yves",
    amountCents: 2500,
    outingUrl: "https://sortie.colist.fr/pilote-JtLFTqLm",
    debtsUrl: "https://sortie.colist.fr/pilote-JtLFTqLm/dettes",
    methods,
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

describe("purchaseConfirmedEmail — moyens de paiement", () => {
  it("avec des moyens : liste masquée et renvoi vers « Régler ma part »", () => {
    const { html } = email([
      { type: "iban", valuePreview: "FR76 **** 1234", displayLabel: "Compte joint" },
      { type: "lydia", valuePreview: "+33 6 ** ** ** 42", displayLabel: null },
    ]);
    expect(html).toContain("FR76 **** 1234");
    expect(html).toContain("+33 6 ** ** ** 42");
    expect(html).toContain("Numéros masqués ici : « Régler ma part » les affiche en entier.");
    expect(html).not.toContain("n&rsquo;a pas encore indiqué");
  });

  it("sans moyen : dit que l'acheteur ne l'a pas encore indiqué", () => {
    const { html } = email([]);
    expect(html).toContain(
      "Nicolas n&rsquo;a pas encore indiqué comment le rembourser. Ça apparaîtra sur ta page dès que c&rsquo;est fait."
    );
    expect(html).not.toContain("Aucun moyen de paiement renseigné");
    expect(html).not.toContain("Numéros masqués ici");
  });
});
