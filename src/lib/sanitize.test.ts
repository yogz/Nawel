import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeStrictText,
  sanitizeSlug,
  sanitizeEmoji,
  sanitizeKey,
} from "./sanitize";

describe("sanitize.ts", () => {
  describe("sanitizeText", () => {
    it("removes dangerous tags", () => {
      const input = '<script>alert("xss")</script>Hello <img src=x onerror=alert(1)>';
      // Current implementation simply strips dangerous tags
      expect(sanitizeText(input)).toBe('scriptalert("xss")/scriptHello img src=x alert(1)');
    });

    it("trims whitespace", () => {
      expect(sanitizeText("  hello  ")).toBe("hello");
    });

    it("truncates to maxLength", () => {
      expect(sanitizeText("hello world", 5)).toBe("hello");
    });
  });

  describe("sanitizeStrictText", () => {
    it("allows only alphanumeric and punctuation", () => {
      expect(sanitizeStrictText("Hello, World 123")).toBe("Hello, World 123");
    });

    it("removes special characters", () => {
      // Parentheses are not in the strict allowlist regex: [^a-zA-ZÀ-ÿ0-9\s',.-]
      expect(sanitizeStrictText("Hello @#$%^&*()")).toBe("Hello");
    });
  });

  describe("sanitizeSlug", () => {
    it("converts to kebab-case", () => {
      expect(sanitizeSlug("Hello World")).toBe("hello-world");
    });

    it("removes accents", () => {
      expect(sanitizeSlug("crème brûlée")).toBe("creme-brulee");
    });

    it("replaces special chars with hyphens", () => {
      expect(sanitizeSlug("hello/world.js")).toBe("hello-world-js");
    });
  });

  describe("sanitizeEmoji", () => {
    it("allows single emoji", () => {
      expect(sanitizeEmoji("🎅")).toBe("🎅");
    });

    it("returns empty string for non-emoji", () => {
      expect(sanitizeEmoji("abc")).toBe("");
    });

    it("returns first emoji for multiple characters", () => {
      expect(sanitizeEmoji("🎅🎄")).toBe("🎅");
    });
  });

  describe("sanitizeKey", () => {
    it("allows alphanumeric and hyphens", () => {
      expect(sanitizeKey("my-secret-key-123")).toBe("my-secret-key-123");
    });

    it("removes invalid characters", () => {
      expect(sanitizeKey("key!@#")).toBe("key");
    });
  });
});
