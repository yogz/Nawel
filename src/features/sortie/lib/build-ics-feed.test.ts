import { describe, expect, it } from "vitest";
import { buildIcsFeed, type FeedOuting } from "./build-ics-feed";

// Minimal outing factory — fixtures explicites pour ne pas masquer les
// régressions iCal récentes derrière un constructeur trop futé. Chaque
// test override les champs qui l'intéressent.
function makeOuting(overrides: Partial<FeedOuting> = {}): FeedOuting {
  return {
    shortId: "abc12345",
    slug: "noam-leuropeen",
    title: "Noam à L'Européen",
    location: "L'Européen, Paris 17e",
    fixedDatetime: new Date("2026-06-15T19:30:00.000Z"),
    status: "open",
    vibe: "concert",
    ticketUrl: "https://www.ticketmaster.fr/fr/event/noam-billet/idmanif/123",
    creatorName: "Sophie",
    sequence: 0,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-15T12:30:00.000Z"),
    confirmedCount: 3,
    confirmedNames: ["Tom", "Marc", "Anaïs"],
    userResponse: "yes",
    ...overrides,
  };
}

const PUBLIC_BASE = "https://sortie.colist.fr";

// Inverse de foldLine RFC 5545 §3.1 : reconstitue les lignes logiques
// pour que les assertions de contenu (DESCRIPTION longue) ne se cassent
// pas quand la sortie est foldée à 73 chars.
function unfold(feed: string): string {
  return feed.replace(/\r\n /g, "");
}

describe("buildIcsFeed", () => {
  describe("structure VCALENDAR", () => {
    it("emits a well-formed VCALENDAR shell with one VEVENT", () => {
      const feed = buildIcsFeed({ outings: [makeOuting()], publicBase: PUBLIC_BASE });
      expect(feed.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
      expect(feed.endsWith("END:VCALENDAR\r\n")).toBe(true);
      expect(feed).toContain("VERSION:2.0\r\n");
      expect(feed).toContain("PRODID:-//Sortie//Sortie FR//FR\r\n");
      expect(feed).toContain("METHOD:PUBLISH\r\n");
      expect(feed).toContain("CALSCALE:GREGORIAN\r\n");
      expect(feed).toContain("X-WR-CALNAME:Sortie\r\n");
      expect(feed).toContain("BEGIN:VEVENT\r\n");
      expect(feed).toContain("END:VEVENT\r\n");
    });

    it("uses CRLF line endings (RFC 5545)", () => {
      const feed = buildIcsFeed({ outings: [makeOuting()], publicBase: PUBLIC_BASE });
      // Pas de LF orphelin (sans CR devant).
      const orphanLF = feed.split("\r\n").join("").includes("\n");
      expect(orphanLF).toBe(false);
    });

    it("supports a custom calendar name", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting()],
        publicBase: PUBLIC_BASE,
        calendarName: "Mon agenda Sortie",
      });
      expect(feed).toContain("X-WR-CALNAME:Mon agenda Sortie\r\n");
    });
  });

  describe("VTIMEZONE intact (régression #179 foldLine)", () => {
    // Le bug #179 venait de la concaténation du bloc VTIMEZONE en une
    // seule string ~400 chars, foldée par foldLine en mélangeant les
    // CRLF de fold avec les LF internes — résultat refusé par les
    // parsers iCal stricts. Le fix stocke les lignes en tableau pour
    // que chaque ligne soit foldée indépendamment. Ce test fige cette
    // garantie : VTIMEZONE et ses sous-blocs doivent apparaître ligne
    // par ligne, sans soft-fold parasite.
    it("emits VTIMEZONE Europe/Paris ligne-par-ligne sans fold", () => {
      const feed = buildIcsFeed({ outings: [makeOuting()], publicBase: PUBLIC_BASE });
      expect(feed).toContain("BEGIN:VTIMEZONE\r\n");
      expect(feed).toContain("TZID:Europe/Paris\r\n");
      expect(feed).toContain("BEGIN:STANDARD\r\n");
      expect(feed).toContain("END:STANDARD\r\n");
      expect(feed).toContain("BEGIN:DAYLIGHT\r\n");
      expect(feed).toContain("END:DAYLIGHT\r\n");
      expect(feed).toContain("END:VTIMEZONE\r\n");
      // Aucune ligne du bloc TZ ne doit avoir été repliée (toutes
      // sont < 73 chars) — chercher une signature de soft-fold dans
      // ce range.
      const tzBlock = feed.slice(
        feed.indexOf("BEGIN:VTIMEZONE"),
        feed.indexOf("END:VTIMEZONE") + "END:VTIMEZONE".length
      );
      expect(tzBlock).not.toMatch(/\r\n /); // pas de continuation line
    });
  });

  describe("VEVENT — propriétés RFC 5545 (régression #180)", () => {
    // Sans SEQUENCE / LAST-MODIFIED, Apple Calendar et Outlook ignorent
    // les updates au refresh (status, suffixe SUMMARY, TRANSP). Le bug
    // #180 a ajouté ces propriétés ; ce test les fige.
    it("emits SEQUENCE, CREATED, LAST-MODIFIED, DTSTAMP", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ sequence: 3 })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("SEQUENCE:3\r\n");
      expect(feed).toContain("CREATED:20260401T100000Z\r\n");
      expect(feed).toContain("LAST-MODIFIED:20260415T123000Z\r\n");
      expect(feed).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/);
    });

    it("emits DTSTART/DTEND avec TZID Europe/Paris", () => {
      const feed = buildIcsFeed({ outings: [makeOuting()], publicBase: PUBLIC_BASE });
      // 19:30 UTC → 21:30 Paris en juin (CEST UTC+2). DTEND = +3h.
      expect(feed).toContain("DTSTART;TZID=Europe/Paris:20260615T213000\r\n");
      expect(feed).toContain("DTEND;TZID=Europe/Paris:20260616T003000\r\n");
    });

    it("emits UID stable basé sur shortId", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ shortId: "xy789abc" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("UID:xy789abc@sortie.colist.fr\r\n");
    });

    it("emits URL canonique avec slug-shortId", () => {
      const feed = buildIcsFeed({ outings: [makeOuting()], publicBase: PUBLIC_BASE });
      expect(feed).toContain(`URL:${PUBLIC_BASE}/noam-leuropeen-abc12345\r\n`);
    });

    it("falls back sur shortId seul quand slug=null", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ slug: null })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain(`URL:${PUBLIC_BASE}/abc12345\r\n`);
    });
  });

  describe("STATUS et TRANSP — sémantique figée vs à confirmer", () => {
    it("STATUS:CONFIRMED + TRANSP:OPAQUE quand userResponse=yes (figée)", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ userResponse: "yes" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("STATUS:CONFIRMED\r\n");
      expect(feed).toContain("TRANSP:OPAQUE\r\n");
    });

    it("STATUS:CONFIRMED + TRANSP:TRANSPARENT quand userResponse=interested (pas figée)", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ userResponse: "interested" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("STATUS:CONFIRMED\r\n");
      expect(feed).toContain("TRANSP:TRANSPARENT\r\n");
    });

    it("STATUS:CANCELLED + TRANSP:TRANSPARENT quand status=cancelled", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ status: "cancelled", userResponse: "yes" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("STATUS:CANCELLED\r\n");
      expect(feed).toContain("TRANSP:TRANSPARENT\r\n");
    });

    it("OPAQUE quand status=purchased même si userResponse=no", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ status: "purchased", userResponse: "no" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("TRANSP:OPAQUE\r\n");
    });

    it("OPAQUE quand userResponse=null (créateur)", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ userResponse: null })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("TRANSP:OPAQUE\r\n");
    });
  });

  describe("SUMMARY suffix · à confirmer (régression #180)", () => {
    it("ajoute le suffixe quand non figée", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ userResponse: "interested" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("SUMMARY:Noam à L'Européen · à confirmer\r\n");
    });

    it("pas de suffixe quand figée", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ userResponse: "yes" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("SUMMARY:Noam à L'Européen\r\n");
      expect(feed).not.toContain("SUMMARY:Noam à L'Européen · à confirmer");
    });
  });

  describe("DESCRIPTION + confirmedNames", () => {
    it("inclut organisateur, count, billetterie, et lien", () => {
      const feed = unfold(buildIcsFeed({ outings: [makeOuting()], publicBase: PUBLIC_BASE }));
      expect(feed).toContain("Organisé par Sophie");
      expect(feed).toContain("3 confirmés : Tom\\, Marc\\, Anaïs"); // virgules échappées RFC
      expect(feed).toContain("Billetterie : https://www.ticketmaster.fr");
      expect(feed).toContain(`Détails et RSVP : ${PUBLIC_BASE}/noam-leuropeen-abc12345`);
    });

    it("affiche +N autres au-delà de 6 noms", () => {
      const feed = unfold(
        buildIcsFeed({
          outings: [
            makeOuting({
              confirmedCount: 12,
              confirmedNames: ["Tom", "Marc", "Sophie", "Anaïs", "Julien", "Yuki", "Léo", "Sara"],
            }),
          ],
          publicBase: PUBLIC_BASE,
        })
      );
      // 6 noms affichés + (12 - 6 = 6) autres
      expect(feed).toContain("Tom\\, Marc\\, Sophie\\, Anaïs\\, Julien\\, Yuki + 6 autres");
      expect(feed).not.toContain("Léo");
    });

    it("singularise quand 1 confirmé", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ confirmedCount: 1, confirmedNames: ["Tom"] })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("1 confirmé : Tom");
      expect(feed).not.toContain("1 confirmés");
    });

    it("retombe sur le compteur quand confirmedNames est vide mais count > 0", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ confirmedCount: 5, confirmedNames: [] })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("5 confirmés");
      expect(feed).not.toContain("5 confirmés :");
    });

    it("omet la ligne confirmés quand count=0", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ confirmedCount: 0, confirmedNames: [] })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).not.toMatch(/\d+ confirmés?/);
    });
  });

  describe("CATEGORIES depuis vibe (coloration Apple Calendar)", () => {
    it.each([
      ["theatre", "Théâtre"],
      ["opera", "Opéra"],
      ["concert", "Concert"],
      ["cine", "Ciné"],
      ["expo", "Expo"],
      ["autre", "Sortie"],
    ] as const)("vibe=%s → CATEGORIES=%s", (vibe, label) => {
      const feed = buildIcsFeed({ outings: [makeOuting({ vibe })], publicBase: PUBLIC_BASE });
      expect(feed).toContain(`CATEGORIES:${label}\r\n`);
    });

    it("omet CATEGORIES quand vibe=null", () => {
      const feed = buildIcsFeed({ outings: [makeOuting({ vibe: null })], publicBase: PUBLIC_BASE });
      expect(feed).not.toContain("CATEGORIES:");
    });
  });

  describe("foldLine (RFC 5545 §3.1)", () => {
    it("plie les lignes > 73 chars avec CRLF + space", () => {
      const longTitle = "X".repeat(200);
      const feed = buildIcsFeed({
        outings: [makeOuting({ title: longTitle })],
        publicBase: PUBLIC_BASE,
      });
      // SUMMARY:XXX...X (208 chars total) → doit contenir au moins une
      // continuation ligne (CRLF + space).
      const summaryStart = feed.indexOf("SUMMARY:");
      const eventEnd = feed.indexOf("END:VEVENT", summaryStart);
      const summarySection = feed.slice(summaryStart, eventEnd);
      expect(summarySection).toMatch(/\r\n /);
    });

    it("ne plie pas les lignes courtes", () => {
      const feed = buildIcsFeed({
        outings: [makeOuting({ title: "Court" })],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("SUMMARY:Court\r\n");
      // La ligne SUMMARY ne doit pas être suivie d'un soft-fold.
      expect(feed).not.toMatch(/SUMMARY:Court\r\n /);
    });
  });

  describe("plusieurs sorties", () => {
    it("emits N VEVENT dans l'ordre fourni", () => {
      const feed = buildIcsFeed({
        outings: [
          makeOuting({ shortId: "first0001", title: "Première" }),
          makeOuting({ shortId: "secnd002", title: "Deuxième" }),
          makeOuting({ shortId: "third003", title: "Troisième" }),
        ],
        publicBase: PUBLIC_BASE,
      });
      const veventCount = feed.match(/BEGIN:VEVENT/g)?.length ?? 0;
      expect(veventCount).toBe(3);
      expect(feed.indexOf("first0001")).toBeLessThan(feed.indexOf("secnd002"));
      expect(feed.indexOf("secnd002")).toBeLessThan(feed.indexOf("third003"));
    });

    it("liste vide → VCALENDAR sans VEVENT mais structurellement valide", () => {
      const feed = buildIcsFeed({ outings: [], publicBase: PUBLIC_BASE });
      expect(feed).toContain("BEGIN:VCALENDAR\r\n");
      expect(feed).toContain("END:VCALENDAR\r\n");
      expect(feed).toContain("BEGIN:VTIMEZONE\r\n");
      expect(feed).not.toContain("BEGIN:VEVENT");
    });
  });

  describe("escapeIcsText (RFC 5545)", () => {
    it("échappe virgule, point-virgule, backslash, newline", () => {
      const feed = buildIcsFeed({
        outings: [
          makeOuting({
            title: "Test, point-virgule; back\\slash",
            location: "Lieu\nmulti-ligne",
          }),
        ],
        publicBase: PUBLIC_BASE,
      });
      expect(feed).toContain("SUMMARY:Test\\, point-virgule\\; back\\\\slash");
      expect(feed).toContain("LOCATION:Lieu\\nmulti-ligne");
    });
  });
});
