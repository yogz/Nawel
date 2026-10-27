import { describe, expect, it } from "vitest";
import { isGenericImageUrl, pickPageImage } from "./event-image";

describe("isGenericImageUrl", () => {
  // Les 5 images génériques relevées sur les vraies sorties (spec §2) + le
  // logo de l'Olympia publié automatiquement pour Jeanne Added.
  it.each([
    [
      "https://www.olympiahall.com/wp-content/uploads/2026/02/Logo-LOlympia-jaune.png",
      { siteName: "L'Olympia", hostname: "www.olympiahall.com" },
    ],
    [
      "https://www.theatredeloeuvre.com/app/uploads/2026/06/logo-theatredeloeuvre.svg",
      { siteName: "Le Théâtre de l'Œuvre", hostname: "www.theatredeloeuvre.com" },
    ],
    [
      "https://www.adidasarena.com/seo.jpg",
      { siteName: "adidas arena", hostname: "www.adidasarena.com" },
    ],
    [
      "https://www.plenitudearena.com/app/uploads/2026/09/photo-concert-plenitude-arena-foule.jpg",
      { siteName: "Plenitude Arena", hostname: "www.parisladefense-arena.com" },
    ],
    [
      "https://statics.digitick.com/commun/images/upload/events/0e/49/LeDernierCedreDuLibanVignette1_110.png",
      { siteName: "theatredeloeuvre", hostname: "web.digitick.com" },
    ],
  ])("rejette %s", (url, ctx) => {
    expect(isGenericImageUrl(url, ctx)).toBe(true);
  });

  it.each([
    ["https://www.billetreduc.com/static/event/325471.jpeg", "www.billetreduc.com"],
    [
      "https://deneb.philharmoniedeparis.fr/uploads/images/cache/event_large/rc/vhiES9m7/uploads/images/699c5d59d38d6_Tamino.jpg",
      "philharmoniedeparis.fr",
    ],
    [
      "https://s1.ticketm.net/dam/a/746/1541d4c3-9c17-400f-84f1-3017d9c9d746_RETINA_LANDSCAPE_16_9.jpg",
      "www.ticketmaster.fr",
    ],
    ["https://www.chatelet.com/app/uploads/2025/04/souad-massi-1-1280x960.jpg", "www.chatelet.com"],
  ])("garde l'affiche %s", (url, hostname) => {
    expect(isGenericImageUrl(url, { hostname })).toBe(false);
  });

  // Faux positifs relevés par le benchmark (Task 3).
  it("garde une affiche qui cite la salle si elle cite aussi le spectacle", () => {
    expect(
      isGenericImageUrl(
        "https://www.grandpalais.fr/sites/default/files/medias/images/2025-11/visuel_dix_plus_grandshilma_af_klint_grandpalais_2025.jpg",
        {
          siteName: "Grand Palais",
          hostname: "www.grandpalais.fr",
          title: "Hilma af Klint, Les peintures du Temple",
        }
      )
    ).toBe(false);
  });

  it("ne prend pas le nom d'une billetterie pour celui d'une salle", () => {
    expect(
      isGenericImageUrl(
        "https://blog.ticketmaster.gr/en/wp-content/uploads/sites/3/2026/04/ANNAxOAKA_TICKETMASTER_738x415.jpg",
        { siteName: "Ticketmaster Hellas Blog EN", hostname: "blog.ticketmaster.gr" }
      )
    ).toBe(false);
  });

  it("rejette l'image provisoire d'un site", () => {
    expect(
      isGenericImageUrl("https://le-zenith.com/media/cache/og_image/build/images/temp-cover.png", {
        siteName: "Zénith Paris - La Villette",
        hostname: "le-zenith.com",
      })
    ).toBe(true);
  });

  it("rejette l'image de catégorie par défaut de Ticketmaster (/dam/c/)", () => {
    // Même image (projecteurs de scène) pour Sarah Lele et Tristan Lopin.
    expect(
      isGenericImageUrl(
        "https://s1.ticketm.net/dam/c/50a/fa9caa1f-73a1-411e-b507-ec56fa59650a_106061_RETINA_LANDSCAPE_16_9.jpg",
        { hostname: "s1.ticketm.net" }
      )
    ).toBe(true);
  });

  it("garde l'affiche propre à un artiste sur Ticketmaster (/dam/a/)", () => {
    expect(
      isGenericImageUrl(
        "https://s1.ticketm.net/dam/a/746/1541d4c3-9c17-400f-84f1-3017d9c9d746_RETINA_LANDSCAPE_16_9.jpg",
        { hostname: "s1.ticketm.net" }
      )
    ).toBe(false);
  });

  it("ne plante pas sur un nom de fichier mal encodé (é en Latin-1)", () => {
    expect(isGenericImageUrl("https://x.fr/img/affiche_th%E9atre.jpg", { hostname: "x.fr" })).toBe(
      false
    );
  });

  it("garde une affiche dont le nom finit par un numéro court ou une date", () => {
    expect(isGenericImageUrl("https://x.fr/affiche-hamlet_01.jpg", { hostname: "x.fr" })).toBe(
      false
    );
    expect(isGenericImageUrl("https://x.fr/visuel-2026-12.jpg", { hostname: "x.fr" })).toBe(false);
  });

  it("rejette toujours les vignettes « 150x150 » et « _110 »", () => {
    expect(isGenericImageUrl("https://x.fr/affiche-150x150.jpg", { hostname: "x.fr" })).toBe(true);
    expect(isGenericImageUrl("https://x.fr/LeDernierCedre_110.png", { hostname: "x.fr" })).toBe(
      true
    );
  });

  it("rejette une image déclarée trop étroite", () => {
    expect(isGenericImageUrl("https://x.fr/a.jpg", { hostname: "x.fr", declaredWidth: 200 })).toBe(
      true
    );
  });
});

describe("pickPageImage", () => {
  const pageUrl = new URL("https://x.fr/spectacle/truc");

  it("préfère l'image du JSON-LD Event à og:image", () => {
    expect(
      pickPageImage(
        { jsonLdImage: "https://x.fr/affiche.jpg", image: "https://x.fr/og.jpg" },
        pageUrl
      )
    ).toBe("https://x.fr/affiche.jpg");
  });

  it("n'utilise pas un logo comme affiche", () => {
    expect(pickPageImage({ image: "https://x.fr/logo-salle.png" }, pageUrl)).toBeUndefined();
  });

  it("retombe sur og:image quand l'image JSON-LD est générique", () => {
    expect(
      pickPageImage(
        { jsonLdImage: "https://x.fr/seo.jpg", image: "https://x.fr/affiche.jpg" },
        pageUrl
      )
    ).toBe("https://x.fr/affiche.jpg");
  });

  it("résout une og:image relative sur l'URL de la page", () => {
    expect(pickPageImage({ image: "/img/a.jpg" }, pageUrl)).toBe("https://x.fr/img/a.jpg");
  });

  it("répare une URL d'image doublée (JSON-LD du Châtelet)", () => {
    expect(
      pickPageImage(
        {
          jsonLdImage:
            "https://www.chatelet.comhttps://www.chatelet.com/app/uploads/2025/04/souad-massi-1_w.jpg",
        },
        new URL("https://www.chatelet.com/programmation/25-26/souad-massi/")
      )
    ).toBe("https://www.chatelet.com/app/uploads/2025/04/souad-massi-1_w.jpg");
  });

  it("résout une og:image sans protocole", () => {
    expect(pickPageImage({ image: "//cdn.x.fr/a.jpg" }, pageUrl)).toBe("https://cdn.x.fr/a.jpg");
  });
});
