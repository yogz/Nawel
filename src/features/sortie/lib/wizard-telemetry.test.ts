import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  trackWizardAbandoned,
  trackWizardGeminiCompleted,
  trackWizardGeminiStarted,
  trackWizardPasteSubmitted,
  trackWizardPublishFailed,
  trackWizardPublishStarted,
  trackWizardPublishSucceeded,
  trackWizardStepEntered,
  trackWizardStepExited,
  trackWizardSuggestionPicked,
} from "./wizard-telemetry";

// Le module charge `@/lib/umami` qui appelle `window.umami?.track` —
// on stub `window.umami` pour capturer les appels et asserter le
// payload exact que le funnel verra côté Umami.
type TrackCall = { name: string; data?: Record<string, unknown> };

const calls: TrackCall[] = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal("window", {
    umami: {
      track: (name: string, data?: Record<string, unknown>) => {
        calls.push({ name, data });
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wizard-telemetry", () => {
  it("trackWizardStepEntered envoie le step et la step précédente", () => {
    trackWizardStepEntered("date", "paste");
    expect(calls).toEqual([
      { name: "wizard_step_entered", data: { step: "date", from_step: "paste" } },
    ]);
  });

  it("trackWizardStepEntered remplace fromStep null par '(initial)'", () => {
    trackWizardStepEntered("paste", null);
    expect(calls[0]?.data?.from_step).toBe("(initial)");
  });

  it("trackWizardStepExited arrondit la durée et passe l'outcome", () => {
    trackWizardStepExited("paste", 1234.7, "advanced");
    expect(calls[0]).toEqual({
      name: "wizard_step_exited",
      data: { step: "paste", duration_ms: 1235, outcome: "advanced" },
    });
  });

  it("trackWizardPasteSubmitted distingue url et text + hasVibe", () => {
    trackWizardPasteSubmitted("url", true);
    trackWizardPasteSubmitted("text", false);
    expect(calls).toEqual([
      { name: "wizard_paste_submitted", data: { kind: "url", has_vibe: true } },
      { name: "wizard_paste_submitted", data: { kind: "text", has_vibe: false } },
    ]);
  });

  it("trackWizardSuggestionPicked porte la source unifiée", () => {
    trackWizardSuggestionPicked("tm");
    trackWizardSuggestionPicked("oa");
    trackWizardSuggestionPicked("gemini");
    expect(calls.map((c) => c.data?.source)).toEqual(["tm", "oa", "gemini"]);
  });

  it("trackWizardGemini Started/Completed ont des noms distincts et l'outcome", () => {
    trackWizardGeminiStarted("optin");
    trackWizardGeminiCompleted("found", 12500);
    expect(calls[0]).toEqual({
      name: "wizard_gemini_started",
      data: { trigger: "optin" },
    });
    expect(calls[1]).toEqual({
      name: "wizard_gemini_completed",
      data: { outcome: "found", duration_ms: 12500 },
    });
  });

  it("trackWizardPublishSucceeded omet paste_to_publish_ms quand null", () => {
    trackWizardPublishSucceeded({
      mode: "fixed",
      isLoggedIn: false,
      hasEmail: false,
      hasVenue: true,
      hasTicketUrl: true,
      hasHeroImage: true,
      pasteToPublishMs: null,
    });
    expect(calls[0]?.data).toMatchObject({
      mode: "fixed",
      is_logged_in: false,
      has_email: false,
      has_venue: true,
      has_ticket_url: true,
      has_hero_image: true,
    });
    expect(calls[0]?.data?.paste_to_publish_ms).toBeUndefined();
  });

  it("trackWizardPublishSucceeded inclut paste_to_publish_ms arrondi quand fourni", () => {
    trackWizardPublishSucceeded({
      mode: "vote",
      isLoggedIn: true,
      hasEmail: true,
      hasVenue: false,
      hasTicketUrl: false,
      hasHeroImage: false,
      pasteToPublishMs: 45678.9,
    });
    expect(calls[0]?.data?.paste_to_publish_ms).toBe(45679);
    expect(calls[0]?.data?.mode).toBe("vote");
  });

  it("trackWizardPublishStarted/Failed sortent les bons names", () => {
    trackWizardPublishStarted("fixed", true);
    trackWizardPublishFailed("validation");
    expect(calls.map((c) => c.name)).toEqual(["wizard_publish_started", "wizard_publish_failed"]);
    expect(calls[1]?.data?.reason).toBe("validation");
  });

  it("trackWizardAbandoned arrondit la durée totale", () => {
    trackWizardAbandoned("date", 30123.4);
    expect(calls[0]).toEqual({
      name: "wizard_abandoned",
      data: { last_step: "date", total_duration_ms: 30123 },
    });
  });
});
