import { describe, expect, it } from "vitest";
import type { AgendaItem } from "@/features/sortie/queries/outing-queries";
import { agendaMode, bucketAgendaByDay } from "./agenda-grid";

describe("agendaMode", () => {
  it("affiche un sondage tranché comme une sortie datée", () => {
    expect(agendaMode("vote", new Date("2026-11-25T18:00:00.000Z"))).toBe("fixed");
  });

  it("garde un sondage non tranché en sondage", () => {
    expect(agendaMode("vote", null)).toBe("vote");
  });

  it("laisse une sortie datée en datée", () => {
    expect(agendaMode("fixed", new Date("2026-11-25T18:00:00.000Z"))).toBe("fixed");
  });
});

describe("bucketAgendaByDay", () => {
  const base: AgendaItem = {
    outingId: "o1",
    shortId: "JtLFTqLm",
    slug: "pilote",
    title: "Pilote",
    location: null,
    heroImageUrl: null,
    mode: "fixed",
    status: "awaiting_purchase",
    isCreator: true,
    myResponse: "yes",
    fixedDate: new Date("2026-11-25T18:00:00.000Z"),
    candidateDates: [],
  };

  it("place une sortie datée sur son seul jour", () => {
    const map = bucketAgendaByDay([base]);
    expect([...map.keys()]).toEqual(["2026-11-25"]);
    expect(map.get("2026-11-25")?.fixed).toHaveLength(1);
  });

  it("étale un sondage ouvert sur chacun de ses créneaux", () => {
    const poll: AgendaItem = {
      ...base,
      mode: "vote",
      fixedDate: null,
      candidateDates: [new Date("2026-10-28T18:00:00.000Z"), new Date("2026-11-25T18:00:00.000Z")],
    };
    const map = bucketAgendaByDay([poll]);
    expect([...map.keys()]).toEqual(["2026-10-28", "2026-11-25"]);
  });
});
