// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

// On espionne la couche d'envoi bas niveau pour vérifier ce qui part vers Umami.
vi.mock("@/lib/umami", () => ({
  sendGAEvent: vi.fn(),
  setUmamiUserId: vi.fn(),
}));

import { sendGAEvent } from "@/lib/umami";
import {
  setAnalyticsContext,
  clearAnalyticsContext,
  trackEvent,
  trackGuestJoined,
  trackRsvp,
} from "@/lib/analytics";

const sent = sendGAEvent as unknown as ReturnType<typeof vi.fn>;

/** Renvoie les payloads envoyés pour un nom d'event donné. */
function payloadsFor(name: string) {
  return sent.mock.calls.filter((c) => c[1] === name).map((c) => c[2]);
}

describe("analytics — contexte hôte/invité", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    clearAnalyticsContext();
  });

  it("merge role + event_slug dans chaque payload", () => {
    setAnalyticsContext({ role: "host", eventSlug: "noel-2026" });
    trackEvent({ action: "tab_changed", label: "shopping" });

    const [payload] = payloadsFor("tab_changed");
    expect(payload).toMatchObject({ role: "host", event_slug: "noel-2026" });
  });

  it("clearAnalyticsContext retire le role", () => {
    setAnalyticsContext({ role: "guest", eventSlug: "x" });
    clearAnalyticsContext();
    trackEvent({ action: "tab_changed" });

    const [payload] = payloadsFor("tab_changed");
    expect(payload?.role).toBeUndefined();
    expect(payload?.event_slug).toBeUndefined();
  });
});

describe("analytics — guest_first_contribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    clearAnalyticsContext();
  });

  it("émet une seule fois par invité/événement", () => {
    setAnalyticsContext({ role: "guest", eventSlug: "noel-2026" });
    trackEvent({ action: "item_created", label: "Pain" });
    trackEvent({ action: "item_created", label: "Vin" });

    expect(payloadsFor("guest_first_contribution")).toHaveLength(1);
  });

  it("n'émet pas pour un hôte", () => {
    setAnalyticsContext({ role: "host", eventSlug: "noel-2026" });
    trackEvent({ action: "item_created", label: "Pain" });

    expect(payloadsFor("guest_first_contribution")).toHaveLength(0);
  });

  it("n'émet pas pour une action non contributive", () => {
    setAnalyticsContext({ role: "guest", eventSlug: "noel-2026" });
    trackEvent({ action: "tab_changed", label: "people" });

    expect(payloadsFor("guest_first_contribution")).toHaveLength(0);
  });

  it("compte un RSVP comme contribution", () => {
    setAnalyticsContext({ role: "guest", eventSlug: "noel-2026" });
    trackRsvp("confirmed");

    expect(payloadsFor("guest_first_contribution")).toHaveLength(1);
    expect(payloadsFor("rsvp_set")).toHaveLength(1);
  });
});

describe("analytics — guest_joined dédupliqué", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    clearAnalyticsContext();
  });

  it("n'émet qu'une fois par événement quel que soit le nombre d'appels", () => {
    setAnalyticsContext({ role: "guest", eventSlug: "noel-2026" });
    trackGuestJoined("guest_access");
    trackGuestJoined("claimed");

    const joins = payloadsFor("guest_joined");
    expect(joins).toHaveLength(1);
    expect(joins[0]).toMatchObject({ method: "guest_access", role: "guest" });
  });

  it("ré-émet pour un événement différent", () => {
    setAnalyticsContext({ role: "guest", eventSlug: "evt-a" });
    trackGuestJoined("new");
    setAnalyticsContext({ role: "guest", eventSlug: "evt-b" });
    trackGuestJoined("new");

    expect(payloadsFor("guest_joined")).toHaveLength(2);
  });
});
