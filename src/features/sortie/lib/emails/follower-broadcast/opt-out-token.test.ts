import { describe, expect, it } from "vitest";
import { buildUnsubscribeUrl } from "./opt-out-token";

describe("buildUnsubscribeUrl", () => {
  it("pointe vers le chemin public, sans le préfixe interne /sortie", () => {
    // `/sortie/unsubscribe` répond 404 sur sortie.colist.fr (le proxy
    // préfixe déjà `/sortie`), le lien des mails abonnés était mort.
    expect(buildUnsubscribeUrl("https://sortie.colist.fr", "abc.def")).toBe(
      "https://sortie.colist.fr/unsubscribe?t=abc.def"
    );
  });

  it("encode le jeton", () => {
    expect(buildUnsubscribeUrl("https://sortie.colist.fr", "a+b/c")).toBe(
      "https://sortie.colist.fr/unsubscribe?t=a%2Bb%2Fc"
    );
  });
});
