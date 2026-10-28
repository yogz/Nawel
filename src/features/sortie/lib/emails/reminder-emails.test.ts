import { describe, expect, it } from "vitest";
import { j1ReminderEmail, j7ReminderEmail } from "./templates";

// Samedi 21 novembre 2026, 20h30 Paris.
const OUTING = {
  outingTitle: "Pilote",
  outingUrl: "https://sortie.colist.fr/pilote-JtLFTqLm",
  fixedDatetime: new Date("2026-11-21T20:30:00+01:00"),
  location: "La Cigale",
};

// Heure du cron : 07:00 UTC = 08:00 Paris en hiver.
const tickOn = (day: string) => new Date(`${day}T07:00:00Z`);

describe("j1ReminderEmail", () => {
  it("dit « demain » quand la sortie est le lendemain", () => {
    const { subject, html } = j1ReminderEmail(OUTING, tickOn("2026-11-20"));
    expect(subject).toBe("Demain — Pilote");
    expect(html).toContain("C’est demain");
    expect(html).toContain("À demain.");
  });

  it("dit « aujourd'hui » quand la sortie est le soir même", () => {
    // Sortie créée la veille après le passage du cron : rappel le matin même.
    const { subject, html } = j1ReminderEmail(OUTING, tickOn("2026-11-21"));
    expect(subject).toBe("Aujourd'hui — Pilote");
    expect(html).toContain("C’est aujourd’hui");
    expect(html).not.toContain("demain");
  });

  it("dit « après-demain » quand la sortie est tôt le matin du surlendemain", () => {
    const early = { ...OUTING, fixedDatetime: new Date("2026-11-21T07:30:00+01:00") };
    const { subject, html } = j1ReminderEmail(early, tickOn("2026-11-19"));
    expect(subject).toBe("Après-demain — Pilote");
    expect(html).toContain("C’est après-demain");
  });
});

describe("j7ReminderEmail", () => {
  it("annonce la sortie dans une semaine sans rien demander", () => {
    const { subject, html } = j7ReminderEmail(OUTING);
    expect(subject).toBe("Dans une semaine — Pilote");
    expect(html).toContain("Dans une semaine");
    expect(html).toContain("21 novembre à 20h30");
    expect(html).toContain("La Cigale");
    expect(html).toContain("Pense à bloquer la date.");
  });
});
