import { describe, expect, it } from "vitest";
import { planParticipants, type CurrentRow, type RequestedPerson } from "./participant-plan";
import type { Regular } from "./regulars";

const CREATOR: CurrentRow = {
  id: "p-creator",
  userId: "u-nicolas",
  anonName: null,
  anonEmail: null,
  extraAdults: 0,
  extraChildren: 0,
};

function regular(over: Partial<Regular>): Regular {
  return {
    key: "u:x",
    name: "X",
    hasEmail: false,
    outingsTogether: 1,
    lastOutingTitle: "Pilote",
    lastOutingAt: null,
    userId: null,
    email: null,
    ...over,
  };
}

const YVES = regular({ key: "u:u-yves", name: "Yves", userId: "u-yves", hasEmail: true });
const CECILE = regular({ key: "n:cecile", name: "Cécile" });
const CLAIRE = regular({
  key: "e:claire@example.com",
  name: "Claire",
  hasEmail: true,
  email: "claire@example.com",
});
const REGULARS = new Map([
  ["k-yves", YVES],
  ["k-cecile", CECILE],
  ["k-claire", CLAIRE],
]);

function plan(
  requested: RequestedPerson[],
  over: Partial<Parameters<typeof planParticipants>[0]> = {}
) {
  return planParticipants({
    current: [CREATOR],
    creatorParticipantId: CREATOR.id,
    requested,
    resolveKey: (k) => REGULARS.get(k),
    hasPurchase: false,
    newEmailsToday: 0,
    ...over,
  });
}

const extras = { extraAdults: 0, extraChildren: 0 };

describe("planParticipants", () => {
  it("ajoute un habitué avec compte par son identifiant de compte", () => {
    const r = plan([{ key: "k-yves", ...extras }]);
    expect(r).toMatchObject({ ok: true, deleteIds: [] });
    expect(r.ok && r.inserts).toEqual([
      { userId: "u-yves", anonName: null, anonEmail: null, ...extras },
    ]);
  });

  it("ajoute un habitué sans compte avec son prénom et son e-mail repris côté serveur", () => {
    const r = plan([{ key: "k-claire", extraAdults: 1, extraChildren: 0 }]);
    expect(r.ok && r.inserts).toEqual([
      {
        userId: null,
        anonName: "Claire",
        anonEmail: "claire@example.com",
        extraAdults: 1,
        extraChildren: 0,
      },
    ]);
  });

  it("ajoute un nouveau prénom sans jamais lui attacher de compte", () => {
    const r = plan([{ newName: "Léa", newEmail: "Lea@Example.com", ...extras }]);
    expect(r.ok && r.inserts).toEqual([
      { userId: null, anonName: "Léa", anonEmail: "lea@example.com", ...extras },
    ]);
  });

  it("retire une personne décochée", () => {
    const current = [
      CREATOR,
      { id: "p-yves", userId: "u-yves", anonName: null, anonEmail: null, ...extras },
    ];
    const r = plan([], { current });
    expect(r).toMatchObject({ ok: true, inserts: [], deleteIds: ["p-yves"] });
  });

  it("garde toujours l'organisateur, même absent de la demande", () => {
    const r = plan([]);
    expect(r).toMatchObject({ ok: true, deleteIds: [] });
  });

  it("met à jour les +1 de l'organisateur et d'une personne déjà inscrite", () => {
    const current = [
      CREATOR,
      { id: "p-cecile", userId: null, anonName: "Cécile", anonEmail: null, ...extras },
    ];
    const r = plan(
      [
        { self: true, extraAdults: 1, extraChildren: 0 },
        { key: "k-cecile", extraAdults: 0, extraChildren: 2 },
      ],
      { current }
    );
    expect(r).toMatchObject({
      ok: true,
      inserts: [],
      deleteIds: [],
      updates: [
        { id: "p-creator", extraAdults: 1, extraChildren: 0 },
        { id: "p-cecile", extraAdults: 0, extraChildren: 2 },
      ],
    });
  });

  it("renvoie vers les dettes si l'achat a été déclaré entre-temps", () => {
    expect(plan([{ key: "k-yves", ...extras }], { hasPurchase: true })).toEqual({
      ok: false,
      message: "L'achat est déjà déclaré.",
      redirectTo: "dettes",
    });
  });

  it("refuse une clé inconnue", () => {
    expect(plan([{ key: "forgée", ...extras }])).toEqual({
      ok: false,
      message: "Cette personne n'est pas dans tes habitués.",
    });
  });

  it("refuse un prénom vide et un e-mail invalide", () => {
    expect(plan([{ newName: "  ", newEmail: null, ...extras }])).toEqual({
      ok: false,
      message: "Il faut un prénom.",
    });
    expect(plan([{ newName: "Léa", newEmail: "pas-un-mail", ...extras }])).toEqual({
      ok: false,
      message: "E-mail invalide.",
    });
  });

  it("refuse deux personnes au même prénom dans la sortie", () => {
    expect(
      plan([
        { key: "k-cecile", ...extras },
        { newName: "cécile", newEmail: null, ...extras },
      ])
    ).toEqual({ ok: false, message: "Il y a déjà une Cécile. Ajoute une initiale : Cécile M." });
  });

  it("refuse plus de 20 personnes à la fois", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      newName: `Ami ${i}`,
      newEmail: null,
      ...extras,
    }));
    expect(plan(many)).toEqual({ ok: false, message: "Pas plus de 20 personnes à la fois." });
  });

  it("refuse plus de 10 nouvelles adresses dans une sortie", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      newName: `Ami ${i}`,
      newEmail: `ami${i}@example.com`,
      ...extras,
    }));
    expect(plan(many)).toEqual({
      ok: false,
      message: "Pas plus de 10 nouvelles adresses par sortie.",
    });
  });

  it("refuse de dépasser 20 nouvelles adresses sur 24 h", () => {
    expect(
      plan([{ newName: "Léa", newEmail: "lea@example.com", ...extras }], { newEmailsToday: 20 })
    ).toEqual({
      ok: false,
      message: "Trop de nouvelles adresses aujourd'hui. Réessaie demain.",
    });
  });

  it("refuse plus de 100 places confirmées", () => {
    const requested = Array.from({ length: 10 }, (_, i) => ({
      newName: `Ami ${i}`,
      newEmail: null,
      extraAdults: 10,
      extraChildren: 0,
    }));
    expect(plan(requested)).toEqual({ ok: false, message: "Pas plus de 100 places par sortie." });
  });
});
