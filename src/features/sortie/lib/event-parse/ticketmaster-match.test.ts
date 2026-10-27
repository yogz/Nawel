import { describe, expect, it } from "vitest";
import type { TicketmasterResult } from "@/features/sortie/lib/ticketmaster-search";
import { isTicketmasterMatch } from "./ticketmaster-match";

function tm(title: string, startsAt: string | null = null): TicketmasterResult {
  return {
    id: "evt",
    title,
    venue: "Salle",
    city: "Paris",
    image: "https://img/x.jpg",
    startsAt,
    ticketUrl: "https://www.ticketmaster.fr/x",
  };
}

describe("isTicketmasterMatch", () => {
  it("accepte un titre Ticketmaster plus long qui contient le spectacle", () => {
    expect(
      isTicketmasterMatch(tm("CELINE DION - Courage World Tour"), {
        title: "Céline Dion",
        date: null,
      })
    ).toBe(true);
  });

  it("refuse un spectacle sans rapport", () => {
    expect(isTicketmasterMatch(tm("Disney sur glace"), { title: "Céline Dion", date: null })).toBe(
      false
    );
  });

  it("refuse le même artiste à une autre date (tournée)", () => {
    expect(
      isTicketmasterMatch(tm("Céline Dion", "2027-06-01T18:00:00Z"), {
        title: "Céline Dion",
        date: "2027-05-08",
      })
    ).toBe(false);
  });

  it("accepte le même artiste à la même date (heure de Paris)", () => {
    expect(
      isTicketmasterMatch(tm("Céline Dion", "2027-05-08T17:30:00Z"), {
        title: "Céline Dion",
        date: "2027-05-08",
      })
    ).toBe(true);
  });

  it("se contente du titre quand la page n'a pas donné de date", () => {
    expect(
      isTicketmasterMatch(tm("Robyn", "2026-11-20T19:00:00Z"), { title: "Robyn", date: null })
    ).toBe(true);
  });

  it("refuse un résultat qui ne partage qu'un mot sur trois", () => {
    expect(
      isTicketmasterMatch(tm("Les Misérables Symphonique"), {
        title: "Les affamés du Châtelet",
        date: null,
      })
    ).toBe(false);
  });
});
