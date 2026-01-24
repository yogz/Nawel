/**
 * Translate service title if it matches a known serviceType key,
 * otherwise return the original title.
 *
 * This allows both new services (stored as keys like "apero", "entree")
 * and legacy services (stored as full names) to work correctly.
 */
export function translateServiceTitle(title: string, t: (key: string) => string): string {
  // List of known service type keys
  const knownKeys = [
    "apero",
    "entree",
    "plat",
    "fromage",
    "dessert",
    "boisson",
    "boissons",
    "autre",
    "divers",
    "custom",
  ];

  // Normalize the title to lowercase for comparison
  const normalizedTitle = title.toLowerCase().trim();

  // If it matches a known key, translate it
  if (knownKeys.includes(normalizedTitle)) {
    try {
      return t(`EventDashboard.Meal.serviceTypes.${normalizedTitle}`);
    } catch {
      // If translation fails, return original
      return title;
    }
  }

  // Otherwise return the original title (for custom service names)
  return title;
}

export function splitServiceTitle(title: string): {
  main: string;
  details?: string;
} {
  if (!title) return { main: "" };

  // Look for parentheses
  const openParen = title.indexOf("(");
  const closeParen = title.lastIndexOf(")");

  if (openParen !== -1 && closeParen > openParen) {
    const main = title.substring(0, openParen).trim();
    const details = title.substring(openParen + 1, closeParen).trim();
    if (main) {
      return { main, details };
    }
  }

  // Fallback split for common phrases if parentheses are missing (legacy or manual edit)
  // This regex matches known prefixes and captures the rest as details
  const fallbackRegex =
    /^(Pour commencer|Plats résistants|Douceurs|Boissons|Pain, Fromage(?:\s*&?\s*Extras)?)(?:\s+)(.*)$/;
  const fbMatch = title.match(fallbackRegex);
  if (fbMatch) {
    return {
      main: fbMatch[1].trim(),
      details: fbMatch[2].trim(),
    };
  }

  return { main: title.trim() };
}
