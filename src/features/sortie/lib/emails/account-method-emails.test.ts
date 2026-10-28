import { describe, expect, it } from "vitest";
import { accountMethodChangedEmail, accountMethodConfirmEmail } from "./templates";

const CONFIRM_URL = "https://sortie.colist.fr/moi/argent/confirmer?t=abcDEF123_-";
const ACCOUNT_URL = "https://sortie.colist.fr/moi/argent#moyens";

// Une coordonnée complète n'a jamais 9 chiffres d'affilée dans ces mails :
// seuls l'aperçu masqué et le libellé y figurent.
function hasLongDigitRun(html: string): boolean {
  return /\d{9,}/.test(html.replace(/[\s.-]/g, ""));
}

describe("accountMethodConfirmEmail", () => {
  const email = () =>
    accountMethodConfirmEmail({
      type: "iban",
      valuePreview: "FR76 **** 1234",
      displayLabel: "Compte joint",
      confirmUrl: CONFIRM_URL,
    });

  it("demande de confirmer le nouveau moyen", () => {
    expect(email().subject).toBe("Confirme ton nouveau moyen de paiement");
  });

  it("porte le lien de confirmation et l'aperçu masqué", () => {
    const { html } = email();
    expect(html).toContain(`href="${CONFIRM_URL}"`);
    expect(html).toContain("FR76 **** 1234");
    expect(html).toContain("IBAN");
    expect(html).toContain("Compte joint");
    expect(html).toContain("15 minutes");
  });

  it("ne contient aucune valeur en clair", () => {
    const { html, subject } = email();
    expect(hasLongDigitRun(html.replace(CONFIRM_URL, ""))).toBe(false);
    expect(hasLongDigitRun(subject)).toBe(false);
  });
});

describe("accountMethodChangedEmail", () => {
  it("prévient d'un ajout confirmé, aperçu seul", () => {
    const { subject, html } = accountMethodChangedEmail({
      change: "confirmed",
      type: "lydia",
      valuePreview: "+33 6 ** ** ** 42",
      accountUrl: ACCOUNT_URL,
    });
    expect(subject).toBe("Moyen de paiement ajouté à ton compte");
    expect(html).toContain("+33 6 ** ** ** 42");
    expect(html).toContain("Lydia");
    expect(html).toContain(`href="${ACCOUNT_URL}"`);
    expect(hasLongDigitRun(html)).toBe(false);
  });

  it("prévient d'un retrait", () => {
    const { subject, html } = accountMethodChangedEmail({
      change: "removed",
      type: "iban",
      valuePreview: "FR76 **** 1234",
      accountUrl: ACCOUNT_URL,
    });
    expect(subject).toBe("Moyen de paiement retiré de ton compte");
    expect(html).toContain("FR76 **** 1234");
    expect(hasLongDigitRun(html)).toBe(false);
  });

  it("échappe le HTML de l'aperçu", () => {
    const { html } = accountMethodChangedEmail({
      change: "removed",
      type: "iban",
      valuePreview: "<b>x</b>",
      accountUrl: ACCOUNT_URL,
    });
    expect(html).not.toContain("<b>x</b>");
  });
});
