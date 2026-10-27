import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { trackParseAttempt } from "@/features/sortie/lib/parse-stats";
import { trackServiceCall } from "@/features/sortie/lib/service-call-stats";
import { POST } from "./route";

vi.mock("@/features/sortie/lib/parse-stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sortie/lib/parse-stats")>()),
  trackParseAttempt: vi.fn(),
}));
vi.mock("@/features/sortie/lib/service-call-stats", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sortie/lib/service-call-stats")>()),
  trackServiceCall: vi.fn(),
}));

describe("isolation de la base", () => {
  // La base locale EST la base de prod : la télémétrie (parse_stats,
  // service_call_stats) ne doit jamais partir d'un test. Une ligne
  // « billetterie.example.com » datée d'avril 2026 en prod prouve que ça
  // s'est déjà produit.
  it("intercepte toute la télémétrie qui écrit en base", () => {
    expect(vi.isMockFunction(trackParseAttempt)).toBe(true);
    expect(vi.isMockFunction(trackServiceCall)).toBe(true);
  });
});

type ParseResponse = {
  title: string | null;
  venue: string | null;
  image: string | null;
  date: string | null;
  time: string | null;
  ticketUrl: string;
  parserHint: { kind: "waf" | "spa"; siteName: string; suggestion: string } | null;
};

function makeRequest(url: string): NextRequest {
  return new NextRequest("http://localhost/api/sortie/parse-ticket-url", {
    method: "POST",
    body: JSON.stringify({ url }),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Helpers to mock the page-fetch (whatever the user pasted) and the
 * Ticketmaster Discovery API call separately. Both go through the
 * same `globalThis.fetch`, so we route by hostname.
 */
function mockFetchByHost(handlers: Record<string, () => Response>): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (input: string | URL | Request) => {
    const urlStr =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const u = new URL(urlStr);
    const handler = handlers[u.hostname];
    if (!handler) {
      throw new Error(`unmocked host: ${u.hostname}`);
    }
    return handler();
  });
  globalThis.fetch = fn as unknown as typeof globalThis.fetch;
  return fn;
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function emptyOgHtml(): string {
  // Anti-bot interstitial / SPA shell — valid HTML but no metadata
  // worth extracting. Mirrors the Datadome challenge page Ticketmaster
  // and Fnac return to non-residential UAs.
  return "<!doctype html><html><head><title>Loading…</title></head><body></body></html>";
}

describe("POST /api/sortie/parse-ticket-url", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.TICKETMASTER_API_KEY;

  beforeEach(() => {
    delete process.env.TICKETMASTER_API_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.TICKETMASTER_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  describe("URL-slug fallback", () => {
    it("derives a Ticketmaster.fr title from the slug when the page is bot-blocked", async () => {
      mockFetchByHost({
        "www.ticketmaster.fr": () => htmlResponse("Forbidden", 403),
      });
      const res = await POST(
        makeRequest(
          "https://www.ticketmaster.fr/fr/manifestation/george-dalaras-billet/idmanif/638386"
        )
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("George Dalaras");
      // No Discovery API key in env → no enrichment, no image/date.
      expect(body.image).toBeNull();
      expect(body.date).toBeNull();
      expect(body.time).toBeNull();
      expect(body.ticketUrl).toBe(
        "https://www.ticketmaster.fr/fr/manifestation/george-dalaras-billet/idmanif/638386"
      );
    });

    it("n'affiche pas un morceau d'URL bourré d'identifiants comme salle (Digitick)", async () => {
      mockFetchByHost({
        "web.digitick.com": () => htmlResponse(emptyOgHtml()),
      });
      const res = await POST(
        makeRequest(
          "https://web.digitick.com/le-dernier-cedre-du-liban-theatre-theatre-de-l-oeuvre-paris-29-mai-2026-css5-theatredeloeuvre-pg101-ri11689401.html"
        )
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.venue).toBeNull();
    });

    it("derives a Fnac Spectacles title + venue from the slug pattern", async () => {
      mockFetchByHost({
        "www.fnacspectacles.com": () => htmlResponse(emptyOgHtml()),
      });
      const res = await POST(
        makeRequest(
          "https://www.fnacspectacles.com/event/george-dalaras-rembetiko-le-grand-rex-20805259/?affiliate=QLY"
        )
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("George Dalaras Rembetiko");
      expect(body.venue).toBe("Le Grand Rex");
    });

    it("strips the trailing -billet variants from Ticketmaster slugs", async () => {
      mockFetchByHost({
        "www.ticketmaster.fr": () => htmlResponse("Forbidden", 403),
      });
      const res = await POST(
        makeRequest("https://www.ticketmaster.fr/fr/manifestation/some-show-tickets/idmanif/123")
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("Some Show");
    });

    it("returns no slug-derived title for a numeric-only path", async () => {
      mockFetchByHost({
        "www.ticketmaster.fr": () => htmlResponse(emptyOgHtml()),
      });
      const res = await POST(
        makeRequest("https://www.ticketmaster.fr/fr/manifestation/12345/idmanif/678")
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBeNull();
      expect(body.venue).toBeNull();
    });

    it("does not split when a leading article has no venue keyword in its tail", async () => {
      // "la-belle-et-la-bete" has "la" markers but no venue noun in
      // either suffix → title should be the whole humanized slug,
      // venue should stay null.
      mockFetchByHost({
        "www.fnacspectacles.com": () => htmlResponse(emptyOgHtml()),
      });
      const res = await POST(
        makeRequest("https://www.fnacspectacles.com/event/la-belle-et-la-bete-12345/")
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("La Belle Et La Bete");
      expect(body.venue).toBeNull();
    });

    it("falls back to the last path segment for unknown hosts", async () => {
      mockFetchByHost({
        "billetterie.example.com": () => htmlResponse(emptyOgHtml()),
      });
      const res = await POST(
        makeRequest("https://billetterie.example.com/spectacles/macbeth-au-theatre-12345")
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("Macbeth");
      expect(body.venue).toBe("Au Theatre");
    });
  });

  describe("OG / JSON-LD extraction wins over slug", () => {
    // Note : on n'utilise plus fnacspectacles.com pour ce test parce
    // que le route handler skippe désormais le fetch sur ce host (WAF
    // anti-bot). Un host non-CTS permet de garder l'assertion claire :
    // quand une page expose un OG, il prime sur la dérivation du slug.
    it("prefers og:title even when a slug title is available", async () => {
      mockFetchByHost({
        "www.theatrechampselysees.fr": () =>
          htmlResponse(`
            <html><head>
              <meta property="og:title" content="George Dalaras — Rembétiko" />
              <meta property="og:image" content="https://img.example.com/poster.jpg" />
            </head><body></body></html>
          `),
      });
      const res = await POST(
        makeRequest("https://www.theatrechampselysees.fr/event/george-dalaras-rembetiko/")
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("George Dalaras — Rembétiko");
      expect(body.image).toBe("https://img.example.com/poster.jpg");
    });
  });

  describe("date et heure en heure de Paris", () => {
    it("ne renvoie pas d'heure quand la page ne donne qu'une date (fin du « 02:00 »)", async () => {
      mockFetchByHost({
        "www.chatelet.com": () =>
          htmlResponse(`<html><head><script type="application/ld+json">
            {"@type":"Event","name":"Souad Massi","startDate":"2026-06-18"}
          </script></head><body><p>Programme de la saison</p></body></html>`),
      });
      const res = await POST(makeRequest("https://www.chatelet.com/programmation/souad-massi/"));
      const body = (await res.json()) as ParseResponse;
      expect(body.date).toBe("2026-06-18");
      expect(body.time).toBeNull();
    });

    it("trouve l'heure écrite près de la date dans la page", async () => {
      mockFetchByHost({
        "www.chatelet.com": () =>
          htmlResponse(`<html><head><script type="application/ld+json">
            {"@type":"Event","name":"Souad Massi","startDate":"2026-06-18"}
          </script></head><body><p>Jeudi 18 juin 2026 à 20h</p></body></html>`),
      });
      const res = await POST(makeRequest("https://www.chatelet.com/programmation/souad-massi/"));
      const body = (await res.json()) as ParseResponse;
      expect(body.time).toBe("20:00");
    });

    it("ne choisit pas d'heure quand les représentations ont des horaires différents", async () => {
      mockFetchByHost({
        "www.operadeparis.fr": () =>
          htmlResponse(`<html><head><script type="application/ld+json">
            [{"@type":"Event","name":"Werther","startDate":"2027-02-14T14:30"},
             {"@type":"Event","name":"Werther","startDate":"2027-02-16T19:30"}]
          </script></head><body></body></html>`),
      });
      const res = await POST(makeRequest("https://www.operadeparis.fr/saison-26-27/opera/werther"));
      const body = (await res.json()) as ParseResponse;
      expect(body.date).toBe("2027-02-14");
      expect(body.time).toBeNull();
    });
  });

  describe("CTS Eventim WAF blocking", () => {
    it("skippe le fetch et retourne parserHint pour fnacspectacles.com", async () => {
      // Le mock fetch ne devrait pas être appelé : on track via spy.
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
      const res = await POST(
        makeRequest(
          "https://www.fnacspectacles.com/event/george-dalaras-rembetiko-le-grand-rex-20805259/"
        )
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as ParseResponse;
      // Slug-derived title doit toujours fonctionner.
      expect(body.title).toBe("George Dalaras Rembetiko");
      // Le hint utilisateur est rempli pour le bon host.
      expect(body.parserHint).toEqual({
        kind: "waf",
        siteName: "Fnac Spectacles",
        suggestion: expect.stringContaining("Ticketmaster"),
      });
      // Aucun fetch HTML vers fnacspectacles n'a été tenté.
      const calls = fetchSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.every((u) => !u.includes("fnacspectacles"))).toBe(true);
    });
  });

  describe("recherche Ticketmaster par le titre (sites de salles sans affiche)", () => {
    function tmEvents(events: unknown[]): Response {
      return new Response(JSON.stringify({ _embedded: { events } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const robynEvent = {
      id: "evt-robyn",
      name: "ROBYN - Sexistential Tour",
      url: "https://www.ticketmaster.fr/fr/manifestation/robyn/idmanif/1",
      images: [{ ratio: "16_9", width: 1024, url: "https://img/robyn.jpg" }],
      dates: { start: { dateTime: "2026-11-20T19:00:00Z", dateTBA: false } },
      _embedded: { venues: [{ name: "Adidas Arena", city: { name: "Paris" } }] },
    };

    it("cherche l'affiche par le titre quand la salle n'expose qu'un logo", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      const fetchFn = mockFetchByHost({
        "www.adidasarena.com": () =>
          htmlResponse(`<html><head>
            <meta property="og:title" content="Robyn" />
            <meta property="og:image" content="https://www.adidasarena.com/seo.jpg" />
          </head><body></body></html>`),
        "app.ticketmaster.com": () => tmEvents([robynEvent]),
      });
      const res = await POST(makeRequest("https://www.adidasarena.com/programmation/robyn--1226"));
      const body = (await res.json()) as ParseResponse;
      expect(body.image).toBe("https://img/robyn.jpg");
      // La page n'a pas donné de date : celle de Ticketmaster pourrait être
      // une autre date de la tournée, on ne la reprend pas.
      expect(body.date).toBeNull();
      expect(body.time).toBeNull();
      // La salle connue du site reste prioritaire sur celle de Ticketmaster.
      expect(body.venue).toBe("Adidas Arena");
      const tmCall = fetchFn.mock.calls.find(([u]) => String(u).includes("app.ticketmaster.com"));
      expect(String(tmCall?.[0])).toContain("keyword=Robyn");
    });

    it("n'appelle pas Ticketmaster quand la page a déjà une vraie affiche", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      const fetchFn = mockFetchByHost({
        "www.adidasarena.com": () =>
          htmlResponse(`<html><head>
            <meta property="og:title" content="Robyn" />
            <meta property="og:image" content="https://www.adidasarena.com/media/robyn-affiche.jpg" />
          </head><body></body></html>`),
        "app.ticketmaster.com": () => tmEvents([robynEvent]),
      });
      const res = await POST(makeRequest("https://www.adidasarena.com/programmation/robyn--1226"));
      const body = (await res.json()) as ParseResponse;
      expect(body.image).toBe("https://www.adidasarena.com/media/robyn-affiche.jpg");
      expect(fetchFn.mock.calls.some(([u]) => String(u).includes("app.ticketmaster.com"))).toBe(
        false
      );
    });

    it("ignore l'image de catégorie par défaut de Ticketmaster", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      mockFetchByHost({
        "www.adidasarena.com": () =>
          htmlResponse(`<html><head><meta property="og:title" content="Robyn" /></head></html>`),
        "app.ticketmaster.com": () =>
          tmEvents([
            {
              ...robynEvent,
              images: [
                {
                  ratio: "16_9",
                  width: 1024,
                  url: "https://s1.ticketm.net/dam/c/50a/fa9caa1f_106061_RETINA_LANDSCAPE_16_9.jpg",
                },
              ],
            },
          ]),
      });
      const res = await POST(makeRequest("https://www.adidasarena.com/programmation/robyn--1226"));
      const body = (await res.json()) as ParseResponse;
      expect(body.image).toBeNull();
      // Le reste du résultat (salle) reste utilisable : seule l'image est générique.
      expect(body.venue).toBe("Adidas Arena");
    });

    it("complète l'heure d'une date de page avec Ticketmaster le même jour", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      mockFetchByHost({
        "www.adidasarena.com": () =>
          htmlResponse(`<html><head><meta property="og:title" content="Robyn" />
            <script type="application/ld+json">{"@type":"Event","name":"Robyn","startDate":"2026-11-20"}</script>
          </head></html>`),
        "app.ticketmaster.com": () => tmEvents([robynEvent]),
      });
      const res = await POST(makeRequest("https://www.adidasarena.com/programmation/robyn--1226"));
      const body = (await res.json()) as ParseResponse;
      expect(body.date).toBe("2026-11-20");
      expect(body.time).toBe("20:00");
    });

    it("ne prend rien d'un résultat Ticketmaster dans une autre salle", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      mockFetchByHost({
        "www.adidasarena.com": () =>
          htmlResponse(`<html><head><meta property="og:title" content="Robyn" /></head></html>`),
        "app.ticketmaster.com": () =>
          tmEvents([
            {
              ...robynEvent,
              _embedded: { venues: [{ name: "Halle Tony Garnier", city: { name: "Lyon" } }] },
            },
          ]),
      });
      const res = await POST(makeRequest("https://www.adidasarena.com/programmation/robyn--1226"));
      const body = (await res.json()) as ParseResponse;
      expect(body.image).toBeNull();
      expect(body.venue).toBe("Adidas Arena");
    });

    it("ne reprend pas l'heure Ticketmaster quand les représentations ont des horaires différents", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      mockFetchByHost({
        "www.adidasarena.com": () =>
          htmlResponse(`<html><head><meta property="og:title" content="Robyn" />
            <script type="application/ld+json">{"@type":"Event","name":"Robyn","startDate":"2026-11-20"}</script>
          </head></html>`),
        "app.ticketmaster.com": () =>
          tmEvents([
            robynEvent,
            {
              ...robynEvent,
              id: "evt-robyn-2",
              dates: { start: { dateTime: "2026-11-20T13:00:00Z", dateTBA: false } },
            },
          ]),
      });
      const res = await POST(makeRequest("https://www.adidasarena.com/programmation/robyn--1226"));
      const body = (await res.json()) as ParseResponse;
      expect(body.image).toBe("https://img/robyn.jpg");
      expect(body.date).toBe("2026-11-20");
      expect(body.time).toBeNull();
    });

    it("ne cherche pas quand le « titre » de la page est le nom de la salle", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      const fetchFn = mockFetchByHost({
        "www.sallepleyel.com": () =>
          htmlResponse(`<html><head>
            <meta property="og:title" content="Salle Pleyel" />
            <meta property="og:site_name" content="Salle Pleyel" />
          </head></html>`),
        "app.ticketmaster.com": () => tmEvents([{ ...robynEvent, name: "Salle Pleyel - Gala" }]),
      });
      const res = await POST(makeRequest("https://www.sallepleyel.com/evenement/loreen/"));
      const body = (await res.json()) as ParseResponse;
      expect(body.image).toBeNull();
      expect(fetchFn.mock.calls.some(([u]) => String(u).includes("app.ticketmaster.com"))).toBe(
        false
      );
    });

    it("rejette un résultat Ticketmaster d'un autre spectacle", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      mockFetchByHost({
        "www.adidasarena.com": () =>
          htmlResponse(`<html><head><meta property="og:title" content="Robyn" /></head></html>`),
        "app.ticketmaster.com": () => tmEvents([{ ...robynEvent, name: "Disney sur glace" }]),
      });
      const res = await POST(makeRequest("https://www.adidasarena.com/programmation/robyn--1226"));
      const body = (await res.json()) as ParseResponse;
      expect(body.image).toBeNull();
      expect(body.date).toBeNull();
    });
  });

  describe("Ticketmaster Discovery API enrichment", () => {
    it("fills image/date/venue from the Discovery API for ticketmaster.fr URLs", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      mockFetchByHost({
        "www.ticketmaster.fr": () => htmlResponse("Forbidden", 403),
        "app.ticketmaster.com": () =>
          new Response(
            JSON.stringify({
              _embedded: {
                events: [
                  {
                    id: "evt-1",
                    name: "George Dalaras",
                    url: "https://www.ticketmaster.fr/fr/.../idmanif/638386",
                    images: [{ ratio: "16_9", width: 1024, url: "https://img/poster.jpg" }],
                    dates: { start: { dateTime: "2026-06-26T19:30:00Z", dateTBA: false } },
                    _embedded: { venues: [{ name: "Le Grand Rex", city: { name: "Paris" } }] },
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          ),
      });
      const res = await POST(
        makeRequest(
          "https://www.ticketmaster.fr/fr/manifestation/george-dalaras-billet/idmanif/638386"
        )
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("George Dalaras");
      expect(body.venue).toBe("Le Grand Rex, Paris");
      expect(body.image).toBe("https://img/poster.jpg");
      // 19:30Z en juin = 21:30 à Paris.
      expect(body.date).toBe("2026-06-26");
      expect(body.time).toBe("21:30");
    });

    it("falls back to slug title when the Discovery API returns nothing", async () => {
      process.env.TICKETMASTER_API_KEY = "test-key";
      mockFetchByHost({
        "www.ticketmaster.fr": () => htmlResponse("Forbidden", 403),
        "app.ticketmaster.com": () =>
          new Response(JSON.stringify({ _embedded: { events: [] } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      });
      const res = await POST(
        makeRequest(
          "https://www.ticketmaster.fr/fr/manifestation/george-dalaras-billet/idmanif/638386"
        )
      );
      const body = (await res.json()) as ParseResponse;
      expect(body.title).toBe("George Dalaras");
      expect(body.image).toBeNull();
    });
  });

  describe("validation + safety", () => {
    it("rejects an empty body with 400", async () => {
      const req = new NextRequest("http://localhost/api/sortie/parse-ticket-url", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("rejects a non-http protocol with 400", async () => {
      const res = await POST(makeRequest("javascript:alert(1)"));
      expect(res.status).toBe(400);
    });

    it("rejects private-IP-like hostnames with 400", async () => {
      const res = await POST(makeRequest("http://127.0.0.1/admin"));
      expect(res.status).toBe(400);
    });
  });
});
