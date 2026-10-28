import { describe, expect, it } from "vitest";
import { canonicalPaymentValue } from "./payment-value";

describe("canonicalPaymentValue", () => {
  it("IBAN : normalisé et masqué comme avant", () => {
    expect(canonicalPaymentValue("iban", "fr14 2004 1010 0505 0001 3M02 606")).toEqual({
      ok: true,
      canonical: "FR1420041010050500013M02606",
      preview: "FR14 **** 2606",
    });
  });

  it("Revolut : la phrase de partage devient le pseudo, affiché en entier", () => {
    expect(
      canonicalPaymentValue(
        "revolut",
        "Bonjour, suivez ce lien pour m'envoyer de l'argent sur Revolut : https://revolut.me/yogzgo"
      )
    ).toEqual({ ok: true, canonical: "@yogzgo", preview: "@yogzgo" });
  });

  it("Revolut : un numéro garde le comportement actuel", () => {
    expect(canonicalPaymentValue("revolut", "+33 6 12 34 56 78")).toEqual({
      ok: true,
      canonical: "+33 6 12 34 56 78",
      preview: "+33 6 ** ** ** 78",
    });
  });

  it("Revolut : un lien douteux est refusé", () => {
    expect(canonicalPaymentValue("revolut", "https://evilrevolut.me/yogzgo")).toEqual({
      ok: false,
      message: "Lien Revolut non reconnu. Colle ton lien revolut.me ou ton numéro.",
    });
  });

  it("Revolut : un texte trop long qui n'est pas un lien est refusé", () => {
    expect(canonicalPaymentValue("revolut", "x".repeat(10) + " " + "y".repeat(50))).toEqual({
      ok: false,
      message: "Lien Revolut non reconnu. Colle ton lien revolut.me ou ton numéro.",
    });
  });

  it("Lydia : inchangé, même s'il ressemble à un pseudo", () => {
    expect(canonicalPaymentValue("lydia", "  0612345678 ")).toEqual({
      ok: true,
      canonical: "0612345678",
      preview: "** ** ** 78",
    });
  });
});
