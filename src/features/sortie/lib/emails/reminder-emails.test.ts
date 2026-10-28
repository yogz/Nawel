import { describe, expect, it } from "vitest";
import { calendarPitchFor, j1ReminderEmail, j7ReminderEmail } from "./templates";

// Samedi 21 novembre 2026, 20h30 Paris.
const OUTING = {
  outingTitle: "Pilote",
  outingUrl: "https://sortie.colist.fr/pilote-JtLFTqLm",
  fixedDatetime: new Date("2026-11-21T20:30:00+01:00"),
  location: "La Cigale",
};

// Heure du cron : 07:00 UTC = 08:00 Paris en hiver.
const tickOn = (day: string) => new Date(`${day}T07:00:00Z`);

function preheader(html: string): string {
  return html.match(/<span style="display:none[^>]*>([^<]*)<\/span>/)?.[1] ?? "";
}

describe("j1ReminderEmail", () => {
  it("dit « demain » quand la sortie est le lendemain", () => {
    const { subject, html } = j1ReminderEmail(OUTING, tickOn("2026-11-20"));
    expect(subject).toBe("C’est demain · Pilote");
    expect(html).toContain("C’est demain");
    expect(html).toContain("Samedi 21 novembre à 20h30. À demain.");
  });

  it("dit « aujourd'hui » quand la sortie est le soir même", () => {
    // Sortie créée la veille après le passage du cron : rappel le matin même.
    const { subject, html } = j1ReminderEmail(OUTING, tickOn("2026-11-21"));
    expect(subject).toBe("C’est aujourd’hui · Pilote");
    expect(html).toContain("À tout à l’heure.");
    expect(html).not.toContain("demain");
  });

  it("dit « après-demain » quand la sortie est tôt le matin du surlendemain", () => {
    const early = { ...OUTING, fixedDatetime: new Date("2026-11-21T07:30:00+01:00") };
    const { subject, html } = j1ReminderEmail(early, tickOn("2026-11-19"));
    expect(subject).toBe("C’est après-demain · Pilote");
    expect(html).toContain("À très vite.");
  });

  it("donne l'heure et le lieu en aperçu, sans répéter l'objet", () => {
    const { html } = j1ReminderEmail(OUTING, tickOn("2026-11-20"));
    expect(preheader(html)).toBe("Rendez-vous à 20h30 · La Cigale");
  });
});

describe("j7ReminderEmail", () => {
  it("annonce la sortie dans une semaine sans rien demander", () => {
    const { subject, html } = j7ReminderEmail(OUTING);
    expect(subject).toBe("Dans une semaine · Pilote");
    expect(html).toContain("Samedi 21 novembre à 20h30. Pense à bloquer la date.");
    expect(html).toContain("Voir la sortie");
    expect(html).toContain("Tu reçois ce rappel parce que tu as répondu présent.");
  });

  it("met la date complète en aperçu, ou seulement la date sans lieu", () => {
    expect(preheader(j7ReminderEmail(OUTING).html)).toBe("Samedi 21 novembre à 20h30 · La Cigale");
    expect(preheader(j7ReminderEmail({ ...OUTING, location: null }).html)).toBe(
      "Samedi 21 novembre à 20h30"
    );
  });
});

describe("proposition du calendrier Sortie dans le J-7", () => {
  it("annonce la connexion à qui n'a pas de compte", () => {
    const { html } = j7ReminderEmail({ ...OUTING, calendarPitch: "anonymous" });
    expect(html).toContain("Connecte-toi avec ton email et ajoute le calendrier Sortie");
    // Chemin public : `/sortie/moi` est une 404 sur sortie.colist.fr.
    expect(html).toContain('href="https://sortie.colist.fr/moi"');
  });

  it("propose seulement l'ajout à qui a un compte sans agenda", () => {
    const { html } = j7ReminderEmail({ ...OUTING, calendarPitch: "account" });
    expect(html).toContain("Ajoute le calendrier Sortie");
    expect(html).not.toContain("Connecte-toi");
  });

  it("ne dit rien à qui a déjà son lien d'agenda, ni dans le rappel de la veille", () => {
    expect(j7ReminderEmail({ ...OUTING, calendarPitch: null }).html).not.toContain("calendrier");
    expect(j1ReminderEmail(OUTING, tickOn("2026-11-20")).html).not.toContain("calendrier");
  });

  it("choisit la phrase selon le compte et le lien d'agenda", () => {
    expect(calendarPitchFor({ userId: null, user: null })).toBe("anonymous");
    expect(calendarPitchFor({ userId: "u1", user: { calendarToken: null } })).toBe("account");
    expect(calendarPitchFor({ userId: "u1", user: { calendarToken: "tok" } })).toBeNull();
  });
});

describe("rappels", () => {
  it("n'utilisent ni deux-points ni tiret cadratin dans leur texte", () => {
    const emails = [
      j7ReminderEmail(OUTING),
      j7ReminderEmail({ ...OUTING, calendarPitch: "anonymous" }),
      j7ReminderEmail({ ...OUTING, calendarPitch: "account" }),
      j1ReminderEmail(OUTING, tickOn("2026-11-19")),
      j1ReminderEmail(OUTING, tickOn("2026-11-20")),
      j1ReminderEmail(OUTING, tickOn("2026-11-21")),
    ];
    for (const { subject, html } of emails) {
      // Tout le texte visible, pied de page compris (pas les styles inline).
      const visibleText = html.slice(html.indexOf("<body")).replace(/<[^>]+>/g, " ");
      for (const text of [subject, preheader(html), visibleText]) {
        expect(text).not.toMatch(/—|&mdash;| :/);
      }
    }
  });
});
