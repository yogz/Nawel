/**
 * Normalises user-typed venue strings for display. The one transform
 * we apply is swapping a standalone " - " separator for the middle
 * dot " · " used everywhere else in the Sortie vocabulary (date
 * pills, meta lines, row cards). Without this, a venue like
 * "Zénith Paris - La Villette" clashes typographically with the
 * surrounding " · " separators.
 *
 * Only the explicit " - " sequence (with spaces on both sides) is
 * replaced so we don't corrupt compound names like "Saint-Germain"
 * or "Porte-St-Denis" where the dashes are part of the word.
 */
export function formatVenue(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  return raw.replace(/\s+-\s+/g, " · ");
}
