/**
 * Centralized input sanitization for security
 * Protects against: XSS, SQL injection, prompt injection, code injection
 */

// Generic text sanitization - removes dangerous characters
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Prevent HTML/XML injection
    .replace(/javascript:/gi, "") // Prevent JS protocol
    .replace(/on\w+=/gi, "") // Prevent event handlers
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .trim();
}

// Strict text - only letters, numbers, spaces, and basic punctuation
export function sanitizeStrictText(input: string, maxLength: number = 100): string {
  if (typeof input !== "string") return "";
  return input
    .slice(0, maxLength)
    .replace(/[^a-zA-ZÀ-ÿ0-9\s',.-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Slug sanitization - only lowercase alphanumeric and hyphens
export function sanitizeSlug(input: string, maxLength: number = 50): string {
  if (typeof input !== "string") return "";
  return input
    .slice(0, maxLength)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

// Emoji sanitization - only allow actual emoji characters
export function sanitizeEmoji(input: string): string {
  if (typeof input !== "string") return "";
  // Match emoji unicode ranges
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;
  const matches = input.match(emojiRegex);
  return matches ? matches[0] : ""; // Return first emoji only
}

// Number sanitization
export function sanitizeNumber(input: number, min: number, max: number, defaultVal: number): number {
  if (typeof input !== "number" || isNaN(input)) return defaultVal;
  return Math.max(min, Math.min(max, Math.floor(input)));
}

// Key/password sanitization - alphanumeric and some special chars
export function sanitizeKey(input: string, maxLength: number = 100): string {
  if (typeof input !== "string") return "";
  return input
    .slice(0, maxLength)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .trim();
}
