/**
 * Minimal HTML escaper for email templates and any place the value will be
 * rendered as HTML without React doing it for us. Escapes the OWASP-minimum
 * set of characters: &, <, >, ", '. Keeps the output size small and never
 * mangles strings that happen to contain one of those bytes in a safe context.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
}
