import { describe, expect, it } from "vitest";
import { isUnusableVenueName, pickVenue } from "./venue";

describe("isUnusableVenueName", () => {
  it.each(["Grande Salle", "Petite salle", "Salle 2", "Studio", "Grande salle Pierre Boulez"])(
    "rejette la salle interne « %s »",
    (name) => {
      expect(isUnusableVenueName(name)).toBe(true);
    }
  );

  it.each(["17 Avenue du Général Eisenhower, 75008 Paris", "8 bd de Bercy", "Paris 75012"])(
    "rejette l'adresse « %s »",
    (name) => {
      expect(isUnusableVenueName(name)).toBe(true);
    }
  );

  it.each([
    "L'Olympia",
    "Salle Pleyel",
    "Théâtre du Châtelet",
    "Plenitude Arena",
    "Studio Hébertot",
    "Studio des Champs-Élysées",
  ])("garde « %s »", (name) => {
    expect(isUnusableVenueName(name)).toBe(false);
  });
});

describe("pickVenue", () => {
  it("préfère le site de la salle à une salle interne du JSON-LD", () => {
    expect(
      pickVenue({
        jsonLdVenue: "Grande Salle",
        siteName: "Théâtre du Châtelet",
        hostname: "www.chatelet.com",
      })
    ).toBe("Théâtre du Châtelet");
  });

  it("préfère le nom du site à une adresse", () => {
    expect(
      pickVenue({
        jsonLdVenue: "17 Avenue du Général Eisenhower, 75008 Paris",
        siteName: "Grand Palais",
        hostname: "www.grandpalais.fr",
      })
    ).toBe("Grand Palais");
  });

  it("utilise og:site_name quand il nomme une salle", () => {
    expect(pickVenue({ siteName: "Salle Pleyel", hostname: "www.sallepleyel.com" })).toBe(
      "Salle Pleyel"
    );
  });

  it("donne un nom propre à un site_name en minuscules", () => {
    expect(pickVenue({ siteName: "accorarena", hostname: "www.accorarena.com" })).toBe(
      "Accor Arena"
    );
  });

  it("nomme la salle d'après son site quand la page ne dit rien", () => {
    expect(pickVenue({ hostname: "philharmoniedeparis.fr" })).toBe("Philharmonie de Paris");
    expect(pickVenue({ hostname: "billetterie.theatremarigny.fr" })).toBe("Théâtre Marigny");
  });

  it("garde une salle JSON-LD utilisable", () => {
    expect(pickVenue({ jsonLdVenue: "L'Olympia", hostname: "www.olympiahall.com" })).toBe(
      "L'Olympia"
    );
  });

  it("nettoie le @ d'un site_name", () => {
    // Page réelle : JSON-LD location.name ET og:site_name valent « @sohoplace ».
    expect(
      pickVenue({ jsonLdVenue: "@sohoplace", siteName: "@sohoplace", hostname: "sohoplace.org" })
    ).toBe("Sohoplace");
  });

  it("décode les entités HTML du site_name", () => {
    expect(pickVenue({ siteName: "L&#039;Olympia", hostname: "example.org" })).toBe("L'Olympia");
  });

  it.each(["www.billetreduc.com", "www.ticketmaster.fr", "web.digitick.com", "shotgun.live"])(
    "ne prend jamais le nom d'une billetterie (%s) pour la salle",
    (hostname) => {
      expect(pickVenue({ siteName: "Théâtre Billetterie", hostname })).toBeUndefined();
    }
  );

  it("retombe sur la salle déduite du titre par l'extraction existante", () => {
    expect(pickVenue({ legacyVenue: "L'Européen", hostname: "leuropeen.info" })).toBe("L'Européen");
  });

  it("n'utilise pas la salle héritée si c'est la salle interne rejetée", () => {
    expect(
      pickVenue({ jsonLdVenue: "Grande Salle", legacyVenue: "Grande Salle", hostname: "x.fr" })
    ).toBeUndefined();
  });
});
