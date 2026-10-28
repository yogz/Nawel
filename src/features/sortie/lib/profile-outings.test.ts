import { describe, expect, it } from "vitest";
import {
  buildProfileDescription,
  organizerLabel,
  splitProfileOutings,
  toShowcaseOuting,
  type ProfileOutingRow,
} from "./profile-outings";

const NOW = new Date("2026-10-28T12:00:00Z");

function row(overrides: Partial<ProfileOutingRow> = {}): ProfileOutingRow {
  return {
    id: "o1",
    shortId: "JtLFTqLm",
    slug: "pilote-sitcom-improvisee",
    title: "Pilote | Sitcom improvisée",
    location: "Le Métropole",
    startsAt: new Date("2026-11-25T18:00:00Z"),
    deadlineAt: new Date("2026-11-20T18:00:00Z"),
    status: "open",
    mode: "fixed",
    heroImageUrl: null,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    confirmedCount: 4,
    creatorUserId: "u1",
    creatorName: "Nicolas",
    creatorUsername: "nicolas",
    ...overrides,
  };
}

describe("splitProfileOutings", () => {
  it("marque isOwn selon le créateur", () => {
    const { upcoming } = splitProfileOutings(
      [
        row({ id: "mine" }),
        row({ id: "other", creatorUserId: "u2" }),
        row({ id: "anon", creatorUserId: null }),
      ],
      "u1",
      NOW
    );
    expect(upcoming.map((o) => [o.id, o.isOwn])).toEqual([
      ["mine", true],
      ["other", false],
      ["anon", false],
    ]);
  });

  it("classe une sortie sans date en à venir et une date passée en passées", () => {
    const { upcoming, past } = splitProfileOutings(
      [
        row({ id: "undated", startsAt: null }),
        row({ id: "old", startsAt: new Date("2026-10-01T18:00:00Z") }),
        row({ id: "next" }),
      ],
      "u1",
      NOW
    );
    expect(upcoming.map((o) => o.id)).toEqual(["undated", "next"]);
    expect(past.map((o) => o.id)).toEqual(["old"]);
  });
});

describe("toShowcaseOuting", () => {
  it("ne garde que l'image, le titre et la salle", () => {
    const [o] = splitProfileOutings([row()], "u1", NOW).upcoming;
    expect(Object.keys(toShowcaseOuting(o)).sort()).toEqual([
      "heroImageUrl",
      "id",
      "location",
      "title",
    ]);
  });
});

describe("organizerLabel", () => {
  const split = (r: ProfileOutingRow) => splitProfileOutings([r], "u1", NOW).upcoming[0];

  it("null pour ses propres sorties", () => {
    expect(organizerLabel(split(row()))).toBeNull();
  });

  it("préfère le @username de l'organisateur", () => {
    expect(
      organizerLabel(
        split(row({ creatorUserId: "u2", creatorName: "Cécile", creatorUsername: "cecile" }))
      )
    ).toBe("organisé par @cecile");
  });

  it("retombe sur le nom, puis sur null pour un créateur anonyme", () => {
    expect(
      organizerLabel(
        split(row({ creatorUserId: "u2", creatorName: "Cécile", creatorUsername: null }))
      )
    ).toBe("organisé par Cécile");
    expect(
      organizerLabel(split(row({ creatorUserId: null, creatorName: null, creatorUsername: null })))
    ).toBeNull();
  });
});

describe("buildProfileDescription", () => {
  it("liste 3 titres sans date puis le reste", () => {
    expect(
      buildProfileDescription({ upcomingTitles: ["A", "B", "C", "D", "E"], pastCount: 0 })
    ).toBe("A · B · C · +2 autres");
    expect(buildProfileDescription({ upcomingTitles: ["A", "B", "C", "D"], pastCount: 0 })).toBe(
      "A · B · C · +1 autre"
    );
  });

  it("tronque un titre trop long", () => {
    const long = "Un titre vraiment beaucoup trop long pour WhatsApp";
    expect(buildProfileDescription({ upcomingTitles: [long], pastCount: 0 })).toBe(
      "Un titre vraiment beaucoup trop…"
    );
  });

  it("aucune sortie à venir", () => {
    expect(buildProfileDescription({ upcomingTitles: [], pastCount: 2 })).toBe(
      "2 sorties passées · la prochaine arrive bientôt."
    );
    expect(buildProfileDescription({ upcomingTitles: [], pastCount: 1 })).toBe(
      "1 sortie passée · la prochaine arrive bientôt."
    );
    expect(buildProfileDescription({ upcomingTitles: [], pastCount: 0 })).toBe(
      "Les prochaines sorties arriveront ici."
    );
  });
});
