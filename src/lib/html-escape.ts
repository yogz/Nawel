const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * OWASP-minimum 5-character HTML escape for email templates and any value
 * rendered as HTML without React doing it for us. Never use on user input
 * that will end up in an href/src context — this only covers textual content.
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);
}
