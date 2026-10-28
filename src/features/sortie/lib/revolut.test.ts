import { describe, expect, it } from "vitest";
import { parseRevolutInput, payUrlForMethod, revolutPayUrl } from "./revolut";

describe("parseRevolutInput", () => {
  it.each([
    ["https://revolut.me/yogzgo", "lien complet"],
    ["revolut.me/yogzgo", "lien sans https"],
    ["https://revolut.me/YogzGo/", "majuscules et barre finale"],
    ["@yogzgo", "pseudo avec @"],
    ["yogzgo", "pseudo seul"],
    [
      "Bonjour, suivez ce lien pour m'envoyer de l'argent sur Revolut : https://revolut.me/yogzgo",
      "phrase de partage Revolut",
    ],
    ["Mon lien : revolut.me/yogzgo.", "point final de phrase"],
  ])("reconnaît le pseudo dans %s (%s)", (raw) => {
    expect(parseRevolutInput(raw)).toEqual({ kind: "tag", tag: "yogzgo" });
  });

  it("garde un numéro de téléphone comme avant", () => {
    expect(parseRevolutInput("+33 6 12 34 56 78")).toEqual({ kind: "other" });
    expect(parseRevolutInput("0612345678")).toEqual({ kind: "other" });
  });

  it("n'extrait rien d'une adresse e-mail", () => {
    expect(parseRevolutInput("jean@gmail.com")).toEqual({ kind: "other" });
  });

  it("refuse un lien revolut.me caché dans le chemin d'un autre site", () => {
    expect(parseRevolutInput("https://evil.com/revolut.me/jean")).toEqual({ kind: "invalid" });
    expect(parseRevolutInput("jean@revolut.me/jean")).toEqual({ kind: "invalid" });
  });

  it("refuse un faux domaine qui contient revolut.me", () => {
    expect(parseRevolutInput("https://evilrevolut.me/yogzgo")).toEqual({ kind: "invalid" });
    expect(parseRevolutInput("https://x.revolut.me/yogzgo")).toEqual({ kind: "invalid" });
  });

  it("refuse un chemin qui sort du pseudo", () => {
    expect(parseRevolutInput("revolut.me/a/../b")).toEqual({ kind: "invalid" });
    expect(parseRevolutInput("revolut.me/yogzgo%2F..")).toEqual({ kind: "invalid" });
  });

  it("refuse deux liens revolut.me différents", () => {
    expect(parseRevolutInput("revolut.me/alice ou revolut.me/bob")).toEqual({ kind: "invalid" });
  });

  it("accepte le même lien répété", () => {
    expect(parseRevolutInput("revolut.me/alice revolut.me/Alice")).toEqual({
      kind: "tag",
      tag: "alice",
    });
  });

  it("refuse un pseudo qui cache un numéro", () => {
    expect(parseRevolutInput("@0612345678")).toEqual({ kind: "invalid" });
    expect(parseRevolutInput("revolut.me/a0612345678")).toEqual({ kind: "invalid" });
  });

  it("refuse un pseudo au format impossible", () => {
    expect(parseRevolutInput("@ab")).toEqual({ kind: "invalid" });
    expect(parseRevolutInput("@a..b")).toEqual({ kind: "invalid" });
    expect(parseRevolutInput("@_yogz")).toEqual({ kind: "invalid" });
    expect(parseRevolutInput(`@${"a".repeat(33)}`)).toEqual({ kind: "invalid" });
    expect(parseRevolutInput("@yo gz")).toEqual({ kind: "invalid" });
  });
});

describe("revolutPayUrl", () => {
  it("pré-remplit le montant en centimes, l'euro et la note", () => {
    const url = new URL(
      revolutPayUrl({ tag: "yogzgo", amountCents: 1250, outingTitle: "Les Misérables" })
    );
    expect(url.origin).toBe("https://revolut.me");
    expect(url.pathname).toBe("/yogzgo");
    expect(url.searchParams.get("amount")).toBe("1250");
    expect(url.searchParams.get("currency")).toBe("EUR");
    expect(url.searchParams.get("note")).toBe("Sortie : Les Misérables");
  });

  it("nettoie le titre et coupe la note à 64 caractères sans casser un emoji", () => {
    const title = `${"a".repeat(60)}🎭 <script>`;
    const url = new URL(revolutPayUrl({ tag: "yogzgo", amountCents: 500, outingTitle: title }));
    const note = url.searchParams.get("note") ?? "";
    expect(Array.from(note).length).toBeLessThanOrEqual(64);
    expect(note).not.toContain("<");
    expect(note.startsWith("Sortie : aaaa")).toBe(true);
  });

  it("ne plante pas sur un titre de 63 caractères suivi d'un emoji", () => {
    expect(() =>
      revolutPayUrl({ tag: "yogzgo", amountCents: 500, outingTitle: `${"b".repeat(55)}😀😀` })
    ).not.toThrow();
  });
});

describe("payUrlForMethod", () => {
  const base = { amountCents: 1250, outingTitle: "Concert" };

  it("donne un lien pour un Revolut enregistré par pseudo", () => {
    const url = payUrlForMethod({ ...base, type: "revolut", value: "@yogzgo" });
    expect(url && new URL(url).pathname).toBe("/yogzgo");
  });

  // Revalidation à la révélation : les anciennes lignes sont des saisies libres.
  it("pas de lien pour un Revolut enregistré par numéro", () => {
    expect(payUrlForMethod({ ...base, type: "revolut", value: "+33 6 12 34 56 78" })).toBeNull();
  });

  // Relecture : une ancienne saisie libre « Jeanne » ne doit pas payer @jeanne.
  it("pas de lien pour une ancienne saisie sans @", () => {
    expect(payUrlForMethod({ ...base, type: "revolut", value: "Jeanne" })).toBeNull();
  });

  it("pas de lien pour une ancienne saisie libre douteuse", () => {
    expect(
      payUrlForMethod({ ...base, type: "revolut", value: "https://evilrevolut.me/x" })
    ).toBeNull();
  });

  it("pas de lien pour les autres moyens", () => {
    expect(payUrlForMethod({ ...base, type: "lydia", value: "@yogzgo" })).toBeNull();
    expect(
      payUrlForMethod({ ...base, type: "iban", value: "FR1420041010050500013M02606" })
    ).toBeNull();
  });
});
