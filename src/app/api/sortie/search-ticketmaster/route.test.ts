import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

type TmFetchPayload = {
  _embedded?: {
    events?: Array<Record<string, unknown>>;
  };
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/sortie/search-ticketmaster", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function mockTmFetch(payload: TmFetchPayload, status = 200): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });
  globalThis.fetch = fn as unknown as typeof globalThis.fetch;
  return fn;
}

describe("POST /api/sortie/search-ticketmaster", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.TICKETMASTER_API_KEY;

  beforeEach(async () => {
    process.env.TICKETMASTER_API_KEY = "test-key";
    // Module-level cache must be cleared between tests so cache-hit
    // assertions don't leak from earlier specs. Easiest path: re-import
    // the module via vi.resetModules in tests that care about cache.
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.TICKETMASTER_API_KEY = originalKey;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("rejects query under 3 chars with 400", async () => {
    const res = await POST(makeRequest({ query: "ab" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_input" });
  });

  it("rejects query over 200 chars with 400", async () => {
    const res = await POST(makeRequest({ query: "x".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("rejects missing body with 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns empty results (200) when API key is missing", async () => {
    delete process.env.TICKETMASTER_API_KEY;
    const fetchSpy = mockTmFetch({});
    const res = await POST(makeRequest({ query: "stromae" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [], correctedQuery: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps a Ticketmaster event payload to the wizard shape", async () => {
    mockTmFetch({
      _embedded: {
        events: [
          {
            id: "evt-1",
            name: "Stromae — Multitude Tour",
            url: "https://www.ticketmaster.fr/stromae",
            images: [
              { ratio: "16_9", width: 640, url: "https://img/small.jpg" },
              { ratio: "16_9", width: 1024, url: "https://img/large.jpg" },
              { ratio: "4_3", width: 800, url: "https://img/wrong-ratio.jpg" },
            ],
            dates: { start: { dateTime: "2026-05-12T19:30:00Z", dateTBA: false } },
            _embedded: {
              venues: [{ name: "Accor Arena", city: { name: "Paris" } }],
            },
          },
        ],
      },
    });
    // Re-import to start with a clean cache for this assertion.
    vi.resetModules();
    const { POST: freshPost } = await import("./route");
    const res = await freshPost(makeRequest({ query: "stromae" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([
      {
        id: "evt-1",
        title: "Stromae — Multitude Tour",
        venue: "Accor Arena",
        city: "Paris",
        image: "https://img/large.jpg",
        startsAt: "2026-05-12T19:30:00Z",
        ticketUrl: "https://www.ticketmaster.fr/stromae",
      },
    ]);
  });

  it("drops events without id/name/url instead of throwing", async () => {
    mockTmFetch({
      _embedded: {
        events: [
          { id: "ok", name: "Good", url: "https://x" },
          { name: "Missing id" },
          { id: "no-url", name: "Missing url" },
        ],
      },
    });
    vi.resetModules();
    const { POST: freshPost } = await import("./route");
    const res = await freshPost(makeRequest({ query: "filter" }));
    const body = (await res.json()) as { results: Array<{ id: string }> };
    expect(body.results).toHaveLength(1);
    expect(body.results[0].id).toBe("ok");
  });

  it("treats dateTBA events as having no startsAt", async () => {
    mockTmFetch({
      _embedded: {
        events: [
          {
            id: "tba",
            name: "TBA Show",
            url: "https://x",
            dates: { start: { dateTime: "2026-05-12T19:30:00Z", dateTBA: true } },
          },
        ],
      },
    });
    vi.resetModules();
    const { POST: freshPost } = await import("./route");
    const res = await freshPost(makeRequest({ query: "tba show" }));
    const body = (await res.json()) as { results: Array<{ startsAt: string | null }> };
    expect(body.results[0].startsAt).toBeNull();
  });

  it("returns empty results (200) when fetch rejects", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    vi.resetModules();
    const { POST: freshPost } = await import("./route");
    const res = await freshPost(makeRequest({ query: "down" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [], correctedQuery: null });
  });

  it("returns empty results (200) when Ticketmaster returns non-2xx", async () => {
    mockTmFetch({}, 429);
    vi.resetModules();
    const { POST: freshPost } = await import("./route");
    const res = await freshPost(makeRequest({ query: "rate limited" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [], correctedQuery: null });
  });

  it("caches identical queries within TTL (single fetch for two calls)", async () => {
    const fetchSpy = mockTmFetch({
      _embedded: {
        events: [{ id: "c1", name: "Cached", url: "https://x" }],
      },
    });
    vi.resetModules();
    const { POST: freshPost } = await import("./route");
    await freshPost(makeRequest({ query: "cache-me" }));
    await freshPost(makeRequest({ query: "Cache-Me" })); // case-insensitive key
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
