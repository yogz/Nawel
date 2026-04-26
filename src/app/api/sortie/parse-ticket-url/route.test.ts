import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

type ParseResponse = {
  title: string | null;
  venue: string | null;
  image: string | null;
  startsAt: string | null;
  ticketUrl: string;
  spaHint: { siteName: string; alternate: string | null } | null;
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
      expect(body.startsAt).toBeNull();
      expect(body.ticketUrl).toBe(
        "https://www.ticketmaster.fr/fr/manifestation/george-dalaras-billet/idmanif/638386"
      );
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

  describe("CTS Eventim WAF blocking", () => {
    it("skippe le fetch et retourne wafHint pour fnacspectacles.com", async () => {
      // Le mock fetch ne devrait pas être appelé : on track via spy.
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
      const res = await POST(
        makeRequest(
          "https://www.fnacspectacles.com/event/george-dalaras-rembetiko-le-grand-rex-20805259/"
        )
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as ParseResponse & {
        wafHint?: { siteName: string; suggestion: string } | null;
      };
      // Slug-derived title doit toujours fonctionner.
      expect(body.title).toBe("George Dalaras Rembetiko");
      // Le hint utilisateur est rempli pour le bon host.
      expect(body.wafHint).toEqual({
        siteName: "Fnac Spectacles",
        suggestion: expect.stringContaining("Ticketmaster"),
      });
      // Aucun fetch HTML vers fnacspectacles n'a été tenté.
      const calls = fetchSpy.mock.calls.map((c) => String(c[0]));
      expect(calls.every((u) => !u.includes("fnacspectacles"))).toBe(true);
    });
  });

  describe("Ticketmaster Discovery API enrichment", () => {
    it("fills image/startsAt/venue from the Discovery API for ticketmaster.fr URLs", async () => {
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
      expect(body.startsAt).toBe("2026-06-26T19:30:00Z");
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
