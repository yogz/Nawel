import { describe, expect, it } from "vitest";
import { computePendingActions } from "./pending-actions";

const FROZEN_NOW = new Date("2026-05-01T12:00:00.000Z");
const D_PLUS = (hours: number) => new Date(FROZEN_NOW.getTime() + hours * 3_600_000);

type Outing = Parameters<typeof computePendingActions>[0]["outings"][number];

const ME = "user-me";
const OTHER = "user-other";

function outing(o: Partial<Outing> & { id: string }): Outing {
  return {
    id: o.id,
    shortId: o.shortId ?? o.id.slice(0, 8),
    slug: o.slug ?? "soiree",
    title: o.title ?? "Une sortie",
    startsAt: o.startsAt ?? D_PLUS(48),
    deadlineAt: o.deadlineAt ?? D_PLUS(24),
    status: o.status ?? "open",
    mode: o.mode ?? "fixed",
    creatorUserId: o.creatorUserId ?? OTHER,
    chosenTimeslotId: o.chosenTimeslotId ?? null,
  };
}

describe("computePendingActions — créateur", () => {
  it("émet pick-date pour un sondage tranché à faire (mode vote, deadline passée, no chosen slot)", () => {
    const o = outing({
      id: "vote-1",
      mode: "vote",
      deadlineAt: D_PLUS(-2),
      chosenTimeslotId: null,
      creatorUserId: ME,
    });
    const actions = computePendingActions({ outings: [o], userId: ME, now: FROZEN_NOW });
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("pick-date");
    expect(actions[0].tone).toBe("hot");
  });

  it("ignore pick-date si chosenTimeslotId est déjà set", () => {
    const o = outing({
      id: "vote-2",
      mode: "vote",
      deadlineAt: D_PLUS(-2),
      chosenTimeslotId: "slot-x",
      creatorUserId: ME,
    });
    expect(computePendingActions({ outings: [o], userId: ME, now: FROZEN_NOW })).toEqual([]);
  });

  it("ignore pick-date si la deadline n'est pas encore passée", () => {
    const o = outing({
      id: "vote-3",
      mode: "vote",
      deadlineAt: D_PLUS(10),
      chosenTimeslotId: null,
      creatorUserId: ME,
    });
    expect(computePendingActions({ outings: [o], userId: ME, now: FROZEN_NOW })).toEqual([]);
  });

  it("émet buy-tickets sur status=awaiting_purchase", () => {
    const o = outing({ id: "ap", status: "awaiting_purchase", creatorUserId: ME });
    const actions = computePendingActions({ outings: [o], userId: ME, now: FROZEN_NOW });
    expect(actions[0].kind).toBe("buy-tickets");
    expect(actions[0].tone).toBe("hot");
  });

  it("émet confirm-purchase sur status=stale_purchase", () => {
    const o = outing({ id: "sp", status: "stale_purchase", creatorUserId: ME });
    const actions = computePendingActions({ outings: [o], userId: ME, now: FROZEN_NOW });
    expect(actions[0].kind).toBe("confirm-purchase");
  });

  it("ne déclenche aucune action créateur sur une outing dont je ne suis pas créateur", () => {
    const o = outing({ id: "ap", status: "awaiting_purchase", creatorUserId: OTHER });
    expect(computePendingActions({ outings: [o], userId: ME, now: FROZEN_NOW })).toEqual([]);
  });
});

describe("computePendingActions — participant", () => {
  it("émet rsvp-soon si pas répondu et deadline ≤ 48h", () => {
    const o = outing({
      id: "rs",
      deadlineAt: D_PLUS(24),
      creatorUserId: OTHER,
    });
    const actions = computePendingActions({
      outings: [o],
      userId: ME,
      myRsvpByOuting: new Map(),
      now: FROZEN_NOW,
    });
    expect(actions[0].kind).toBe("rsvp-soon");
    expect(actions[0].tone).toBe("acid");
  });

  it("considère interested comme 'pas répondu' (cf. vote bypass)", () => {
    const o = outing({ id: "rs", deadlineAt: D_PLUS(24), creatorUserId: OTHER });
    const myRsvpByOuting = new Map([[o.id, { response: "interested" as const }]]);
    const actions = computePendingActions({
      outings: [o],
      userId: ME,
      myRsvpByOuting,
      now: FROZEN_NOW,
    });
    expect(actions[0]?.kind).toBe("rsvp-soon");
  });

  it("ne déclenche pas rsvp-soon si yes/no/handle_own", () => {
    const o = outing({ id: "rs", deadlineAt: D_PLUS(24), creatorUserId: OTHER });
    for (const response of ["yes", "no", "handle_own"] as const) {
      const myRsvpByOuting = new Map([[o.id, { response }]]);
      expect(
        computePendingActions({
          outings: [o],
          userId: ME,
          myRsvpByOuting,
          now: FROZEN_NOW,
        })
      ).toEqual([]);
    }
  });

  it("ne déclenche pas rsvp-soon si la deadline est > 48h", () => {
    const o = outing({ id: "rs", deadlineAt: D_PLUS(72), creatorUserId: OTHER });
    expect(
      computePendingActions({
        outings: [o],
        userId: ME,
        myRsvpByOuting: new Map(),
        now: FROZEN_NOW,
      })
    ).toEqual([]);
  });

  it("ne déclenche pas rsvp-soon si la deadline est passée", () => {
    const o = outing({ id: "rs", deadlineAt: D_PLUS(-1), creatorUserId: OTHER });
    expect(
      computePendingActions({
        outings: [o],
        userId: ME,
        myRsvpByOuting: new Map(),
        now: FROZEN_NOW,
      })
    ).toEqual([]);
  });

  it("ne déclenche pas rsvp-soon si l'outing n'est plus open", () => {
    const o = outing({
      id: "rs",
      deadlineAt: D_PLUS(24),
      status: "awaiting_purchase",
      creatorUserId: OTHER,
    });
    expect(
      computePendingActions({
        outings: [o],
        userId: ME,
        myRsvpByOuting: new Map(),
        now: FROZEN_NOW,
      })
    ).toEqual([]);
  });
});

describe("computePendingActions — tri et filtres", () => {
  it("trie hot avant acid, puis deadline asc à tone égal", () => {
    const ap = outing({
      id: "ap",
      status: "awaiting_purchase",
      creatorUserId: ME,
      deadlineAt: D_PLUS(-10),
    });
    const apLater = outing({
      id: "ap2",
      status: "awaiting_purchase",
      creatorUserId: ME,
      deadlineAt: D_PLUS(-1),
    });
    const rsvp = outing({ id: "rs", deadlineAt: D_PLUS(24), creatorUserId: OTHER });
    const actions = computePendingActions({
      outings: [rsvp, apLater, ap],
      userId: ME,
      myRsvpByOuting: new Map(),
      now: FROZEN_NOW,
    });
    expect(actions.map((a) => a.outingId)).toEqual(["ap", "ap2", "rs"]);
  });

  it("respecte excludeOutingId — typiquement la sortie déjà héro-isée", () => {
    const ap = outing({ id: "ap", status: "awaiting_purchase", creatorUserId: ME });
    expect(
      computePendingActions({
        outings: [ap],
        userId: ME,
        excludeOutingId: "ap",
        now: FROZEN_NOW,
      })
    ).toEqual([]);
  });

  it("retourne 1 action max par outing — pas de doublon", () => {
    // Outing créateur + awaiting_purchase + le user n'a pas RSVP : on ne
    // veut pas émettre buy-tickets ET rsvp-soon (le rsvp-soon est skippé
    // de toute façon par status != open).
    const o = outing({
      id: "dual",
      status: "awaiting_purchase",
      creatorUserId: ME,
      deadlineAt: D_PLUS(24),
    });
    const actions = computePendingActions({
      outings: [o],
      userId: ME,
      myRsvpByOuting: new Map(),
      now: FROZEN_NOW,
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("buy-tickets");
  });
});
