import { describe, expect, it } from "vitest";
import { findRegularByViewKey, groupRegulars, toRegularView, type RegularRow } from "./regulars";

const SECRET = "test-secret";

function row(over: Partial<RegularRow>): RegularRow {
  return {
    userId: null,
    userName: null,
    anonName: null,
    email: null,
    outingId: "o1",
    outingTitle: "Pilote",
    startsAt: new Date("2026-11-25T18:00:00.000Z"),
    ...over,
  };
}

describe("groupRegulars", () => {
  it("regroupe un compte sur plusieurs sorties et compte les sorties ensemble", () => {
    const rows = [
      row({ userId: "u-yves", userName: "Yves", outingId: "o1" }),
      row({ userId: "u-yves", userName: "Yves", outingId: "o2", outingTitle: "Robyn" }),
      row({ userId: "u-yves", userName: "Yves", outingId: "o3", outingTitle: "Loreen" }),
    ];
    const [yves] = groupRegulars(rows, "u-nicolas");
    expect(yves).toMatchObject({ name: "Yves", outingsTogether: 3, userId: "u-yves" });
  });

  it("ne fusionne jamais une Julie avec e-mail et une Julie sans e-mail", () => {
    const rows = [
      row({ anonName: "Julie", email: "julie@example.com", outingId: "o1" }),
      row({ anonName: "Julie", email: null, outingId: "o2" }),
    ];
    expect(groupRegulars(rows, "u-nicolas")).toHaveLength(2);
  });

  it("regroupe deux « julie » sans e-mail (casse et accents ignorés)", () => {
    const rows = [
      row({ anonName: "Julie", outingId: "o1" }),
      row({ anonName: "julie ", outingId: "o2" }),
    ];
    expect(groupRegulars(rows, "u-nicolas")).toHaveLength(1);
  });

  it("regroupe une même adresse sans compte, quelle que soit la casse", () => {
    const rows = [
      row({ anonName: "Cécile", email: "Cecile@Example.com", outingId: "o1" }),
      row({ anonName: "Cécile", email: "cecile@example.com", outingId: "o2" }),
    ];
    expect(groupRegulars(rows, "u-nicolas")).toHaveLength(1);
  });

  it("exclut l'organisateur lui-même", () => {
    expect(groupRegulars([row({ userId: "u-nicolas", userName: "Nicolas" })], "u-nicolas")).toEqual(
      []
    );
  });

  it("trie par nombre de sorties ensemble puis par la plus récente", () => {
    const rows = [
      row({ anonName: "Ancien", outingId: "o1", startsAt: new Date("2026-01-01") }),
      row({ anonName: "Récent", outingId: "o2", startsAt: new Date("2026-10-01") }),
      row({ anonName: "Fidèle", outingId: "o3" }),
      row({ anonName: "Fidèle", outingId: "o4" }),
    ];
    expect(groupRegulars(rows, "u-nicolas").map((r) => r.name)).toEqual([
      "Fidèle",
      "Récent",
      "Ancien",
    ]);
  });
});

describe("toRegularView", () => {
  it("n'expose ni e-mail ni identifiant de compte au navigateur", () => {
    const [regular] = groupRegulars(
      [row({ userId: "u-yves", userName: "Yves", email: "yves@example.com" })],
      "u-nicolas"
    );
    const view = toRegularView(regular!, SECRET);
    expect(Object.keys(view).sort()).toEqual(
      ["hasEmail", "key", "lastOutingAt", "lastOutingTitle", "name", "outingsTogether"].sort()
    );
    expect(JSON.stringify(view)).not.toContain("yves@example.com");
    expect(JSON.stringify(view)).not.toContain("u-yves");
    expect(view.hasEmail).toBe(true);
  });

  it("retrouve l'habitué à partir de sa clé opaque, et seulement elle", () => {
    const regulars = groupRegulars(
      [row({ userId: "u-yves", userName: "Yves" }), row({ anonName: "Cécile", outingId: "o2" })],
      "u-nicolas"
    );
    const key = toRegularView(regulars[0]!, SECRET).key;
    expect(findRegularByViewKey(regulars, key, SECRET)).toBe(regulars[0]);
    expect(findRegularByViewKey(regulars, "u:u-yves", SECRET)).toBeUndefined();
    expect(findRegularByViewKey(regulars, key, "autre-secret")).toBeUndefined();
  });
});
