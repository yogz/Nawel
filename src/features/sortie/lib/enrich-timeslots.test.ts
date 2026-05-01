import { describe, expect, it } from "vitest";
import { enrichTimeslots } from "./enrich-timeslots";

const baseDate = new Date("2026-06-15T19:00:00Z");

function p(args: {
  id: string;
  name?: string;
  userId?: string | null;
  cookie?: string | null;
  image?: string | null;
}) {
  return {
    id: args.id,
    userId: args.userId ?? null,
    cookieTokenHash: args.cookie ?? null,
    anonName: args.name ?? null,
    user: args.userId ? { name: args.name ?? null, image: args.image ?? null } : null,
  };
}

describe("enrichTimeslots", () => {
  it("renvoie les voteurs yes et no résolus depuis participants", () => {
    const out = enrichTimeslots({
      creatorUserId: null,
      creatorCookieTokenHash: "creator-hash",
      participants: [
        p({ id: "p1", name: "Léa", cookie: "creator-hash" }),
        p({ id: "p2", name: "Marc", cookie: "h2" }),
      ],
      timeslots: [
        {
          id: "t1",
          startsAt: baseDate,
          votes: [
            { participantId: "p1", available: true },
            { participantId: "p2", available: false },
          ],
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.yesCount).toBe(1);
    expect(out[0]!.noCount).toBe(1);
    expect(out[0]!.yesVoters[0]!.name).toBe("Léa");
    expect(out[0]!.yesVoters[0]!.isCreator).toBe(true);
    expect(out[0]!.noVoters[0]!.name).toBe("Marc");
  });

  it("ignore les votes orphelins (participant supprimé entre-temps)", () => {
    const out = enrichTimeslots({
      creatorUserId: null,
      creatorCookieTokenHash: null,
      participants: [],
      timeslots: [
        {
          id: "t1",
          startsAt: baseDate,
          votes: [{ participantId: "ghost", available: true }],
        },
      ],
    });
    expect(out[0]!.yesCount).toBe(0);
    expect(out[0]!.yesVoters).toEqual([]);
  });

  it("priorise userId sur cookieTokenHash pour détecter le créateur", () => {
    const out = enrichTimeslots({
      creatorUserId: "user-x",
      creatorCookieTokenHash: "h-other",
      participants: [p({ id: "p1", name: "Léa", userId: "user-x" })],
      timeslots: [
        {
          id: "t1",
          startsAt: baseDate,
          votes: [{ participantId: "p1", available: true }],
        },
      ],
    });
    expect(out[0]!.yesVoters[0]!.isCreator).toBe(true);
  });

  it("préserve l'ordre des créneaux d'entrée", () => {
    const t2 = new Date(baseDate.getTime() + 86400000);
    const out = enrichTimeslots({
      creatorUserId: null,
      creatorCookieTokenHash: null,
      participants: [],
      timeslots: [
        { id: "t1", startsAt: baseDate, votes: [] },
        { id: "t2", startsAt: t2, votes: [] },
      ],
    });
    expect(out.map((r) => r.id)).toEqual(["t1", "t2"]);
  });
});
