// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { shouldIgnoreClientError } from "./analytics-monitor";

describe("shouldIgnoreClientError", () => {
  it("ignore le bruit ResizeObserver", () => {
    expect(shouldIgnoreClientError("ResizeObserver loop limit exceeded")).toBe(true);
    expect(
      shouldIgnoreClientError("ResizeObserver loop completed with undelivered notifications.")
    ).toBe(true);
  });

  it("ignore les erreurs cross-origin anonymisées", () => {
    expect(shouldIgnoreClientError("Script error.")).toBe(true);
    expect(shouldIgnoreClientError("Script error")).toBe(true);
  });

  it("laisse passer les vraies erreurs", () => {
    expect(shouldIgnoreClientError("Minified React error #418")).toBe(false);
    expect(shouldIgnoreClientError("Load failed")).toBe(false);
    expect(shouldIgnoreClientError("Cannot read properties of undefined")).toBe(false);
  });

  it("gère les messages vides", () => {
    expect(shouldIgnoreClientError("")).toBe(false);
    expect(shouldIgnoreClientError(undefined)).toBe(false);
    expect(shouldIgnoreClientError(null)).toBe(false);
  });
});
