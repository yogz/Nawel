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

/**
 * Splits a service title into a main part and a detail part.
 * Example: "Pour commencer (Apéro, Entrées légères, Salades)"
 * -> { main: "Pour commencer", details: "Apéro, Entrées légères, Salades" }
 */
export function splitServiceTitle(title: string): {
  main: string;
  details?: string;
} {
  if (!title) return { main: "" };

  const lastOpen = title.lastIndexOf("(");
  const lastClose = title.lastIndexOf(")");

  if (lastOpen !== -1 && lastClose > lastOpen) {
    const main = title.substring(0, lastOpen).trim();
    const details = title.substring(lastOpen + 1, lastClose).trim();
    if (main) {
      return { main, details };
    }
  }

  return { main: title.trim() };
}
