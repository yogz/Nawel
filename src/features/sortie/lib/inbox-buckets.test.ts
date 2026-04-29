import { describe, expect, it } from "vitest";
import { bucketizeByAction, flattenInboxByPriority } from "./inbox-buckets";
import type { RsvpResponse } from "@/features/sortie/components/rsvp-sheets";

type Outing = {
  id: string;
  startsAt: Date | null;
  deadlineAt: Date;
  mode: "fixed" | "vote";
  status: string;
};

type Rsvp = { response: RsvpResponse | "interested" };
function rsvp(response: RsvpResponse | "interested"): Rsvp {
  return { response };
}

const FROZEN_NOW = new Date("2026-05-01T12:00:00.000Z");
const D_PLUS = (days: number) => new Date(FROZEN_NOW.getTime() + days * 86_400_000);

function outing(o: Partial<Outing> & { id: string }): Outing {
  return {
    startsAt: D_PLUS(7),
    deadlineAt: D_PLUS(2),
    mode: "fixed",
    status: "open",
    ...o,
  };
}

describe("bucketizeByAction", () => {
  it("returns 4 ordered buckets even when all are empty", () => {
    const result = bucketizeByAction<Outing>([], new Map());
    expect(result.map((b) => b.key)).toEqual(["a-decide", "going", "waiting", "declined"]);
    expect(result.every((b) => b.outings.length === 0)).toBe(true);
  });

  it("classifies an outing without participant row into a-decide", () => {
    const o = outing({ id: "no-rsvp" });
    const buckets = bucketizeByAction([o], new Map());
    expect(buckets[0].outings).toEqual([o]);
    expect(buckets[1].outings).toEqual([]);
  });

  it("classifies yes / handle_own as going", () => {
    const a = outing({ id: "a" });
    const b = outing({ id: "b" });
    const myRsvp = new Map([
      ["a", rsvp("yes")],
      ["b", rsvp("handle_own")],
    ]);
    const buckets = bucketizeByAction([a, b], myRsvp);
    expect(buckets.find((x) => x.key === "going")?.outings.map((o) => o.id)).toEqual(["a", "b"]);
  });

  it("classifies no as declined", () => {
    const o = outing({ id: "skip" });
    const buckets = bucketizeByAction([o], new Map([["skip", rsvp("no")]]));
    expect(buckets.find((x) => x.key === "declined")?.outings).toEqual([o]);
  });

  it("interested + sondage non tranché (startsAt null) → waiting", () => {
    const o = outing({ id: "v", mode: "vote", startsAt: null });
    const buckets = bucketizeByAction([o], new Map([["v", rsvp("interested")]]));
    expect(buckets.find((x) => x.key === "waiting")?.outings).toEqual([o]);
  });

  it("interested + créneau tranché (startsAt set) → a-decide (re-RSVP requis)", () => {
    // pickTimeslotAction laisse "interested" tel quel quand l'invité n'a
    // pas voté pour le slot gagnant — la sortie remonte en a-decide.
    const o = outing({ id: "stuck", mode: "vote", startsAt: D_PLUS(10) });
    const buckets = bucketizeByAction([o], new Map([["stuck", rsvp("interested")]]));
    expect(buckets.find((x) => x.key === "a-decide")?.outings).toEqual([o]);
    expect(buckets.find((x) => x.key === "waiting")?.outings).toEqual([]);
  });

  it("trie a-decide par deadline asc (urgence)", () => {
    const far = outing({ id: "far", deadlineAt: D_PLUS(10) });
    const close = outing({ id: "close", deadlineAt: D_PLUS(1) });
    const mid = outing({ id: "mid", deadlineAt: D_PLUS(5) });
    const buckets = bucketizeByAction([far, close, mid], new Map());
    expect(buckets[0].outings.map((o) => o.id)).toEqual(["close", "mid", "far"]);
  });

  it("trie going par startsAt asc, sortes sans date en queue", () => {
    const undated = outing({ id: "undated", mode: "vote", startsAt: null });
    const tomorrow = outing({ id: "tom", startsAt: D_PLUS(1) });
    const nextWeek = outing({ id: "next", startsAt: D_PLUS(7) });
    const myRsvp = new Map([
      ["undated", rsvp("yes")],
      ["tom", rsvp("yes")],
      ["next", rsvp("yes")],
    ]);
    const buckets = bucketizeByAction([undated, nextWeek, tomorrow], myRsvp);
    expect(buckets.find((x) => x.key === "going")?.outings.map((o) => o.id)).toEqual([
      "tom",
      "next",
      "undated",
    ]);
  });

  describe("deadline close → bascule vers declined", () => {
    it("vote-mode sondage en cours, pas voté, deadline passée → declined", () => {
      // Le visiteur ne peut plus voter (castVoteAction bloque sur
      // deadline absolue), inutile de l'afficher en a-decide.
      const o = outing({
        id: "missed-vote",
        mode: "vote",
        startsAt: null,
        deadlineAt: D_PLUS(-1),
      });
      const buckets = bucketizeByAction([o], new Map(), FROZEN_NOW);
      expect(buckets.find((x) => x.key === "declined")?.outings).toEqual([o]);
      expect(buckets.find((x) => x.key === "a-decide")?.outings).toEqual([]);
    });

    it("mode fixed, pas RSVP, deadline passée + status non open → declined", () => {
      const o = outing({
        id: "missed-rsvp",
        mode: "fixed",
        deadlineAt: D_PLUS(-1),
        status: "awaiting_purchase",
      });
      const buckets = bucketizeByAction([o], new Map(), FROZEN_NOW);
      expect(buckets.find((x) => x.key === "declined")?.outings).toEqual([o]);
    });

    it("mode fixed, pas RSVP, deadline passée + status='open' → reste a-decide", () => {
      // Le créateur n'a pas avancé la sortie : RSVP toujours accepté
      // (cf. rsvpAction `status !== "open"` bypass).
      const o = outing({
        id: "still-open",
        mode: "fixed",
        deadlineAt: D_PLUS(-1),
        status: "open",
      });
      const buckets = bucketizeByAction([o], new Map(), FROZEN_NOW);
      expect(buckets.find((x) => x.key === "a-decide")?.outings).toEqual([o]);
    });

    it("interested + chosen slot + deadline passée + status non open → declined", () => {
      // Stuck-interested après pickTimeslotAction, mais re-RSVP bloqué.
      const o = outing({
        id: "stuck-closed",
        mode: "vote",
        startsAt: D_PLUS(10),
        deadlineAt: D_PLUS(-1),
        status: "purchased",
      });
      const buckets = bucketizeByAction(
        [o],
        new Map([["stuck-closed", rsvp("interested")]]),
        FROZEN_NOW
      );
      expect(buckets.find((x) => x.key === "declined")?.outings).toEqual([o]);
      expect(buckets.find((x) => x.key === "a-decide")?.outings).toEqual([]);
    });

    it("interested + sondage non tranché, deadline passée → reste waiting", () => {
      // Le créateur peut encore picker même après deadline (pickTimeslotAction
      // ne checke pas la deadline) ; l'invité a fait sa part, il attend.
      const o = outing({
        id: "voted-closed",
        mode: "vote",
        startsAt: null,
        deadlineAt: D_PLUS(-1),
      });
      const buckets = bucketizeByAction(
        [o],
        new Map([["voted-closed", rsvp("interested")]]),
        FROZEN_NOW
      );
      expect(buckets.find((x) => x.key === "waiting")?.outings).toEqual([o]);
    });
  });

  it("précédence : 1 sortie 1 bucket, premier match gagne", () => {
    // Cas pathologique où une sortie aurait response="yes" + startsAt=null
    // → tombe dans `going`, jamais double-classé.
    const o = outing({ id: "x", mode: "vote", startsAt: null });
    const buckets = bucketizeByAction([o], new Map([["x", rsvp("yes")]]));
    const occurences = buckets.filter((b) => b.outings.some((c) => c.id === "x")).length;
    expect(occurences).toBe(1);
  });
});

describe("flattenInboxByPriority", () => {
  it("préserve l'ordre bucket > intra-bucket", () => {
    const aD1 = outing({ id: "a1", deadlineAt: D_PLUS(1) });
    const aD2 = outing({ id: "a2", deadlineAt: D_PLUS(3) });
    const g1 = outing({ id: "g1", startsAt: D_PLUS(5) });
    const d1 = outing({ id: "d1" });
    const buckets = bucketizeByAction(
      [g1, aD2, d1, aD1],
      new Map([
        ["g1", rsvp("yes")],
        ["d1", rsvp("no")],
      ])
    );
    expect(flattenInboxByPriority(buckets).map((o) => o.id)).toEqual(["a1", "a2", "g1", "d1"]);
  });
});
