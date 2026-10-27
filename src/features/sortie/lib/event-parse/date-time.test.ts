import { describe, expect, it } from "vitest";
import { findShowTime, localDateFromIsoDay, toParisDateTime } from "./date-time";

describe("localDateFromIsoDay", () => {
  it("donne le jour calendaire local, sans glisser au jour précédent", () => {
    const d = localDateFromIsoDay("2026-06-18");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 18]);
  });
});

describe("toParisDateTime", () => {
  it("garde une date sans heure… sans heure (fin du « 02:00 »)", () => {
    expect(toParisDateTime("2026-06-18")).toEqual({ date: "2026-06-18", time: null });
  });

  it("lit une heure locale sans fuseau comme heure de Paris", () => {
    expect(toParisDateTime("2027-03-11T20:00")).toEqual({ date: "2027-03-11", time: "20:00" });
  });

  it("convertit une heure avec décalage", () => {
    expect(toParisDateTime("2026-06-15T19:30:00+02:00")).toEqual({
      date: "2026-06-15",
      time: "19:30",
    });
  });

  it("garde l'heure écrite par la page même si son décalage est faux (Sohoplace, Londres)", () => {
    expect(toParisDateTime("2026-09-21T19:00:00-04:00")).toEqual({
      date: "2026-09-21",
      time: "19:00",
    });
  });

  it("convertit un décalage écrit sans deux-points (OpenAgenda)", () => {
    expect(toParisDateTime("2026-03-14T20:00:00+0100")).toEqual({
      date: "2026-03-14",
      time: "20:00",
    });
  });

  it("convertit une heure UTC en heure de Paris (hiver)", () => {
    expect(toParisDateTime("2026-11-25T18:00:00Z")).toEqual({ date: "2026-11-25", time: "19:00" });
  });

  it("lit le format compact de la Paris La Défense Arena", () => {
    expect(toParisDateTime("20270508T19:30:0")).toEqual({ date: "2027-05-08", time: "19:30" });
  });

  it("renvoie vide pour une valeur illisible", () => {
    expect(toParisDateTime("bientôt")).toEqual({ date: null, time: null });
  });
});

describe("findShowTime", () => {
  it("trouve l'heure écrite après la date", () => {
    expect(findShowTime("Le mercredi 11 novembre 2026 à 20h, grande salle.", "2026-11-11")).toBe(
      "20:00"
    );
  });

  it("lit une date numérique et une heure avec minutes", () => {
    expect(findShowTime("Représentation : 11/11/2026 – 20h30", "2026-11-11")).toBe("20:30");
  });

  it("refuse de choisir entre deux heures proches de la date", () => {
    expect(
      findShowTime("11 novembre · Ouverture des portes 19h00 – concert 20h30", "2026-11-11")
    ).toBeNull();
  });

  it("ignore une heure trop éloignée de la date", () => {
    const filler = " ".repeat(120);
    expect(
      findShowTime(`11 novembre 2026${filler}Billetterie ouverte de 12h à 18h`, "2026-11-11")
    ).toBeNull();
  });

  it("refuse plusieurs représentations à des heures différentes", () => {
    expect(
      findShowTime("11 novembre 2026 à 14h30 · 11 novembre 2026 à 20h00", "2026-11-11")
    ).toBeNull();
  });

  it("accepte la même heure répétée pour la date", () => {
    expect(findShowTime("11 nov. 2026 20h00 — 11 novembre : 20h00", "2026-11-11")).toBe("20:00");
  });

  it("renvoie vide quand la date n'apparaît pas", () => {
    expect(findShowTime("Le 12 novembre à 20h", "2026-11-11")).toBeNull();
  });
});
