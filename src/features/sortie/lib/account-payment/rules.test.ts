import { describe, expect, it } from "vitest";
import {
  checkAccountMethodAdd,
  checkOutingMethodAdd,
  isDuplicateMethod,
  mayCopyAccountMethods,
  mayEditOutingMethods,
  mayManageAccountMethods,
  selectMethodsToCopy,
  validateMethodLabel,
} from "./rules";

const CONFIRMED = new Date("2026-10-28T10:00:00.000Z");

describe("mayManageAccountMethods", () => {
  it("accepte un compte connecté à l'e-mail vérifié", () => {
    expect(mayManageAccountMethods({ userId: "u1", emailVerified: true })).toBe(true);
  });

  it("refuse un compte mot de passe non vérifié (pré-création par un tiers)", () => {
    expect(mayManageAccountMethods({ userId: "u1", emailVerified: false })).toBe(false);
    expect(mayManageAccountMethods({ userId: "u1", emailVerified: null })).toBe(false);
  });

  it("refuse un visiteur non connecté", () => {
    expect(mayManageAccountMethods({ userId: null, emailVerified: true })).toBe(false);
  });
});

describe("mayCopyAccountMethods", () => {
  it("copie quand l'acheteur est le compte connecté", () => {
    expect(mayCopyAccountMethods({ sessionUserId: "u1", buyerUserId: "u1" })).toBe(true);
  });

  it("ne copie pas pour un acheteur reconnu par cookie seul (pas de session)", () => {
    expect(mayCopyAccountMethods({ sessionUserId: null, buyerUserId: "u1" })).toBe(false);
  });

  it("ne copie pas quand la ligne n'a pas de compte (inscription sans compte puis connexion)", () => {
    expect(mayCopyAccountMethods({ sessionUserId: "u1", buyerUserId: null })).toBe(false);
  });

  it("ne copie pas les moyens d'un autre compte", () => {
    expect(mayCopyAccountMethods({ sessionUserId: "u2", buyerUserId: "u1" })).toBe(false);
  });

  it("ne copie pas sans session ni compte", () => {
    expect(mayCopyAccountMethods({ sessionUserId: null, buyerUserId: null })).toBe(false);
  });
});

describe("mayEditOutingMethods", () => {
  it("ligne rattachée à un compte : exige la même session", () => {
    expect(mayEditOutingMethods({ rowUserId: "u1", sessionUserId: "u1" })).toBe(true);
    expect(mayEditOutingMethods({ rowUserId: "u1", sessionUserId: null })).toBe(false);
    expect(mayEditOutingMethods({ rowUserId: "u1", sessionUserId: "u2" })).toBe(false);
  });

  it("ligne sans compte : comportement actuel (cookie suffit)", () => {
    expect(mayEditOutingMethods({ rowUserId: null, sessionUserId: null })).toBe(true);
    expect(mayEditOutingMethods({ rowUserId: null, sessionUserId: "u2" })).toBe(true);
  });
});

describe("validateMethodLabel", () => {
  // Contournement relevé par la relecture finale : des séparateurs effacés
  // par le nettoyage reconstituaient un IBAN complet dans le libellé.
  it.each(["FR76/1234/5678/9012", "06+12+34+56+78", "FR76:1234|5678:9012"])(
    "refuse un numéro masqué par des séparateurs (%s)",
    (raw) => {
      expect(validateMethodLabel(raw)).toEqual({
        ok: false,
        message: "Pas de numéro dans le libellé.",
      });
    }
  );

  it("renvoie le libellé déjà nettoyé", () => {
    expect(validateMethodLabel("  Compte <b>perso</b>  ")).toEqual({
      ok: true,
      label: "Compte bpersob",
    });
  });

  it("vide ou absent → pas de libellé", () => {
    expect(validateMethodLabel(undefined)).toEqual({ ok: true, label: null });
    expect(validateMethodLabel("   ")).toEqual({ ok: true, label: null });
  });

  it("garde un libellé court", () => {
    expect(validateMethodLabel("  Compte joint  ")).toEqual({ ok: true, label: "Compte joint" });
  });

  it("refuse plus de 40 caractères", () => {
    expect(validateMethodLabel("a".repeat(41))).toEqual({
      ok: false,
      message: "40 caractères maximum.",
    });
    expect(validateMethodLabel("a".repeat(40))).toEqual({ ok: true, label: "a".repeat(40) });
  });

  it("refuse un numéro glissé dans le libellé, même espacé", () => {
    const refused = { ok: false, message: "Pas de numéro dans le libellé." };
    expect(validateMethodLabel("vire sur FR7612345678")).toEqual(refused);
    expect(validateMethodLabel("FR76 1234 5678 9")).toEqual(refused);
    expect(validateMethodLabel("06 12 34 56 78")).toEqual(refused);
  });

  it("accepte quelques chiffres", () => {
    expect(validateMethodLabel("Livret 2026")).toEqual({ ok: true, label: "Livret 2026" });
  });
});

describe("checkAccountMethodAdd", () => {
  const iban = (preview: string, confirmedAt: Date | null = CONFIRMED) => ({
    type: "iban",
    valuePreview: preview,
    confirmedAt,
  });

  it("accepte un premier moyen", () => {
    expect(
      checkAccountMethodAdd({ existing: [], type: "iban", valuePreview: "FR76 **** 1234" })
    ).toEqual({ ok: true });
  });

  it("refuse au-delà de 5 moyens confirmés", () => {
    const existing = ["1111", "2222", "3333", "4444", "5555"].map((t) => iban(`FR76 **** ${t}`));
    expect(checkAccountMethodAdd({ existing, type: "lydia", valuePreview: "** ** ** 42" })).toEqual(
      {
        ok: false,
        message: "5 moyens maximum. Retire-en un pour en ajouter un autre.",
      }
    );
  });

  it("les moyens en attente ne comptent pas dans le plafond", () => {
    const existing = [
      ...["1111", "2222", "3333", "4444"].map((t) => iban(`FR76 **** ${t}`)),
      iban("FR76 **** 5555", null),
    ];
    expect(checkAccountMethodAdd({ existing, type: "lydia", valuePreview: "** ** ** 42" })).toEqual(
      { ok: true }
    );
  });

  it("refuse un doublon (même type, même aperçu)", () => {
    expect(
      checkAccountMethodAdd({
        existing: [iban("FR76 **** 1234")],
        type: "iban",
        valuePreview: "FR76 **** 1234",
      })
    ).toEqual({ ok: false, message: "Tu as déjà un IBAN qui finit par 1234." });
    expect(
      checkAccountMethodAdd({
        existing: [{ type: "lydia", valuePreview: "+33 6 ** ** ** 42", confirmedAt: null }],
        type: "lydia",
        valuePreview: "+33 6 ** ** ** 42",
      })
    ).toEqual({ ok: false, message: "Tu as déjà un Lydia qui finit par 42." });
  });

  it("doublon Revolut par pseudo : nomme le pseudo entier", () => {
    expect(
      checkAccountMethodAdd({
        existing: [{ type: "revolut", valuePreview: "@jean.dupont", confirmedAt: CONFIRMED }],
        type: "revolut",
        valuePreview: "@jean.dupont",
      })
    ).toEqual({ ok: false, message: "Tu as déjà le Revolut @jean.dupont." });
  });

  it("même aperçu mais autre type : pas un doublon", () => {
    expect(
      checkAccountMethodAdd({
        existing: [{ type: "lydia", valuePreview: "** ** ** 42", confirmedAt: CONFIRMED }],
        type: "wero",
        valuePreview: "** ** ** 42",
      })
    ).toEqual({ ok: true });
  });
});

describe("isDuplicateMethod", () => {
  it("compare type et aperçu", () => {
    const existing = [{ type: "iban", valuePreview: "FR76 **** 1234" }];
    expect(isDuplicateMethod(existing, "iban", "FR76 **** 1234")).toBe(true);
    expect(isDuplicateMethod(existing, "iban", "FR76 **** 9999")).toBe(false);
    expect(isDuplicateMethod(existing, "lydia", "FR76 **** 1234")).toBe(false);
    expect(isDuplicateMethod([], "iban", "FR76 **** 1234")).toBe(false);
  });
});

describe("selectMethodsToCopy", () => {
  const accountMethods = [
    { id: "a", confirmedAt: CONFIRMED },
    { id: "b", confirmedAt: null },
    { id: "c", confirmedAt: CONFIRMED },
  ];

  it("garde les ids cochés et confirmés, dans l'ordre du compte", () => {
    expect(selectMethodsToCopy({ checkedIds: ["c", "a"], accountMethods })).toEqual(["a", "c"]);
  });

  it("ignore un moyen non confirmé même coché", () => {
    expect(selectMethodsToCopy({ checkedIds: ["b"], accountMethods })).toEqual([]);
  });

  it("ignore un id forgé (moyen d'un autre compte)", () => {
    expect(selectMethodsToCopy({ checkedIds: ["zzz", "a"], accountMethods })).toEqual(["a"]);
  });

  it("rien de coché → rien de copié", () => {
    expect(selectMethodsToCopy({ checkedIds: [], accountMethods })).toEqual([]);
  });

  it("ne duplique pas un id coché deux fois", () => {
    expect(selectMethodsToCopy({ checkedIds: ["a", "a"], accountMethods })).toEqual(["a"]);
  });
});

describe("checkOutingMethodAdd (par sortie)", () => {
  const existing = [{ type: "iban", valuePreview: "FR76 **** 1234" }];

  it("refuse un doublon pour cette sortie", () => {
    expect(
      checkOutingMethodAdd({ existing, type: "iban", valuePreview: "FR76 **** 1234" })
    ).toEqual({ ok: false, message: "Déjà ajouté pour cette sortie." });
  });

  it("accepte un autre moyen, sans plafond de compte", () => {
    expect(
      checkOutingMethodAdd({ existing, type: "iban", valuePreview: "FR76 **** 9999" })
    ).toEqual({ ok: true });
    const many = ["1", "2", "3", "4", "5", "6"].map((t) => ({
      type: "lydia",
      valuePreview: `** ** ** 0${t}`,
    }));
    expect(
      checkOutingMethodAdd({ existing: many, type: "lydia", valuePreview: "** ** ** 07" })
    ).toEqual({ ok: true });
  });
});
