/**
 * Centralized input sanitization for security
 * Protects against: XSS, SQL injection, prompt injection, code injection
 *
 * Uses DOMPurify for robust HTML sanitization (works on both server and client)
 */

import DOMPurify from "isomorphic-dompurify";

// Configure DOMPurify to strip all HTML (text-only output)
const TEXT_ONLY_CONFIG = {
  ALLOWED_TAGS: [], // No HTML tags allowed
  ALLOWED_ATTR: [], // No attributes allowed
  KEEP_CONTENT: true, // Keep text content
};

/**
 * Generic text sanitization - removes all HTML and dangerous content
 * Uses DOMPurify for robust XSS protection
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (typeof input !== "string") {
    return "";
  }

  // First pass: DOMPurify strips all HTML/scripts
  const sanitized = DOMPurify.sanitize(input, TEXT_ONLY_CONFIG);

  // Second pass: additional safety measures
  return sanitized
    .slice(0, maxLength)
    .replace(/javascript:/gi, "") // Prevent JS protocol (belt and suspenders)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\r\n|\r/g, "\n") // Normalize line endings
    .trim();
}

// Strict text - only letters, numbers, spaces, and basic punctuation
export function sanitizeStrictText(input: string, maxLength: number = 100): string {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .slice(0, maxLength)
    .replace(/[^\p{L}0-9\s',.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Slug sanitization - only lowercase alphanumeric and hyphens
export function sanitizeSlug(input: string, maxLength: number = 50): string {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .normalize("NFD") // Split accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove accent marks
    .slice(0, maxLength)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

// Emoji sanitization - only allow actual emoji characters
export function sanitizeEmoji(input: string): string {
  if (typeof input !== "string") {
    return "";
  }
  // Match emoji unicode ranges
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;
  const matches = input.match(emojiRegex);
  return matches ? matches[0] : ""; // Return first emoji only
}

// Number sanitization
export function sanitizeNumber(
  input: number,
  min: number,
  max: number,
  defaultVal: number
): number {
  if (typeof input !== "number" || isNaN(input)) {
    return defaultVal;
  }
  return Math.max(min, Math.min(max, Math.floor(input)));
}

// Key/password sanitization - alphanumeric and some special chars
export function sanitizeKey(input: string, maxLength: number = 100): string {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .slice(0, maxLength)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .trim();
}
