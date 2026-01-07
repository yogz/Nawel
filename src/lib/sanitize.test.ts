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
    it("completely removes script tags and their content", () => {
      const input = '<script>alert("xss")</script>Hello';
      // DOMPurify completely removes script tags including content (most secure)
      expect(sanitizeText(input)).toBe("Hello");
    });

    it("strips all HTML tags", () => {
      const input = "<b>bold</b> <i>italic</i> <a href='#'>link</a>";
      expect(sanitizeText(input)).toBe("bold italic link");
    });

    it("removes img tags with onerror handlers", () => {
      const input = "<img src=x onerror=alert(1)>Hello";
      expect(sanitizeText(input)).toBe("Hello");
    });

    it("removes javascript: protocol", () => {
      const input = "Click javascript:alert(1) here";
      expect(sanitizeText(input)).toBe("Click alert(1) here");
    });

    it("handles nested script attempts", () => {
      const input = "<<script>script>alert(1)<</script>/script>";
      const result = sanitizeText(input);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
    });

    it("trims whitespace", () => {
      expect(sanitizeText("  hello  ")).toBe("hello");
    });

    it("truncates to maxLength", () => {
      expect(sanitizeText("hello world", 5)).toBe("hello");
    });

    it("handles empty and invalid input", () => {
      expect(sanitizeText("")).toBe("");
      expect(sanitizeText(null as unknown as string)).toBe("");
      expect(sanitizeText(undefined as unknown as string)).toBe("");
    });

    it("removes control characters", () => {
      const input = "hello\x00\x08world";
      expect(sanitizeText(input)).toBe("helloworld");
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
