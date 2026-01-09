/**
 * Translate service title if it matches a known serviceType key,
 * otherwise return the original title.
 *
 * This allows both new services (stored as keys like "apero", "entree")
 * and legacy services (stored as full names) to work correctly.
 */
export function translateServiceTitle(
  title: string,
  t: (key: string) => string
): string {
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
