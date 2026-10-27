import { describe, expect, it } from "vitest";
import { groupAssignOutings } from "./admin-assign-outings";

const NOW = new Date("2026-10-27T20:00:00.000Z");
const at = (iso: string | null) => ({
  shortId: iso ?? "poll",
  fixedDatetime: iso ? new Date(iso) : null,
});

describe("groupAssignOutings", () => {
  it("met les sondages puis les sorties à venir (la plus proche d'abord) en haut", () => {
    const { upcoming } = groupAssignOutings(
      [at("2026-12-01T19:00:00.000Z"), at(null), at("2026-11-02T19:00:00.000Z")],
      NOW
    );
    expect(upcoming.map((o) => o.shortId)).toEqual([
      "poll",
      "2026-11-02T19:00:00.000Z",
      "2026-12-01T19:00:00.000Z",
    ]);
  });

  it("range les sorties passées à part, la plus récente d'abord", () => {
    const { upcoming, past } = groupAssignOutings(
      [
        at("2026-09-01T19:00:00.000Z"),
        at("2026-10-20T19:00:00.000Z"),
        at("2026-11-02T19:00:00.000Z"),
      ],
      NOW
    );
    expect(upcoming.map((o) => o.shortId)).toEqual(["2026-11-02T19:00:00.000Z"]);
    expect(past.map((o) => o.shortId)).toEqual([
      "2026-10-20T19:00:00.000Z",
      "2026-09-01T19:00:00.000Z",
    ]);
  });

  it("garde dans « à venir » une sortie du jour même déjà commencée", () => {
    const { upcoming } = groupAssignOutings([at("2026-10-27T18:00:00.000Z")], NOW);
    expect(upcoming).toHaveLength(1);
  });
});
