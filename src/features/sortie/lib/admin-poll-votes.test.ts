import { describe, expect, it } from "vitest";
import { resolveAdminPollVotes } from "./admin-poll-votes";

const SLOTS = ["slot-a", "slot-b", "slot-c"];

describe("resolveAdminPollVotes", () => {
  it("marque les créneaux cochés dispo et les autres pas dispo", () => {
    expect(resolveAdminPollVotes(["slot-a", "slot-c"], SLOTS)).toEqual({
      response: "interested",
      votes: [
        { timeslotId: "slot-a", available: true },
        { timeslotId: "slot-b", available: false },
        { timeslotId: "slot-c", available: true },
      ],
    });
  });

  it("passe en no quand aucun créneau n'est coché", () => {
    const result = resolveAdminPollVotes([], SLOTS);
    expect(result.response).toBe("no");
    expect(result.votes.every((v) => !v.available)).toBe(true);
  });

  it("ignore les créneaux d'une autre sortie", () => {
    const result = resolveAdminPollVotes(["slot-a", "foreign"], SLOTS);
    expect(result.votes.map((v) => v.timeslotId)).toEqual(SLOTS);
    expect(result.votes.filter((v) => v.available).map((v) => v.timeslotId)).toEqual(["slot-a"]);
  });

  it("retombe en no si seuls des créneaux étrangers sont envoyés", () => {
    expect(resolveAdminPollVotes(["foreign"], SLOTS).response).toBe("no");
  });
});
