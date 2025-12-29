import { type Ingredient, type Item } from "./types";

export interface AggregatedShoppingItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  checked: boolean;
  sources: {
    type: "ingredient" | "item";
    ingredient?: Ingredient;
    item: Item;
    mealTitle: string;
    serviceTitle: string;
    originalQuantity: string | null;
  }[];
}

/**
 * Parses a quantity string like "400g" or "4" into a numeric value and a unit.
 * If no numeric value is found, value is null and the whole string is the unit.
 */
export function parseQuantity(quantityStr: string | null | undefined): {
  value: number | null;
  unit: string;
} {
  if (!quantityStr) return { value: null, unit: "" };

  const trimmed = quantityStr.trim();
  // Match number (integer or decimal with . or ,) at the beginning, followed by optional unit
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);

  if (!match) {
    return { value: null, unit: trimmed.toLowerCase() };
  }

  const value = parseFloat(match[1].replace(",", "."));
  const unit = match[2].trim().toLowerCase();

  return { value, unit };
}

/**
 * Aggregates a list of shopping items by name and unit.
 * Only items with the same name (case-insensitive) and same unit (case-insensitive) are merged.
 */
export function aggregateShoppingList(
  items: {
    type: "ingredient" | "item";
    ingredient?: Ingredient;
    item: Item;
    mealTitle: string;
    serviceTitle: string;
  }[]
): AggregatedShoppingItem[] {
  const groups: Record<string, AggregatedShoppingItem> = {};

  items.forEach((entry) => {
    const rawName = entry.type === "ingredient" ? entry.ingredient!.name : entry.item.name;
    const rawQuantity =
      entry.type === "ingredient" ? entry.ingredient!.quantity : entry.item.quantity;

    const { value, unit } = parseQuantity(rawQuantity);
    const normalizedName = rawName.trim().toLowerCase();

    // Key for grouping: name + unit
    // We use a separator that's unlikely to be in names
    const key = `${normalizedName}|${unit}`;

    if (!groups[key]) {
      groups[key] = {
        id: key,
        name: rawName, // Keep original casing of the first item
        quantity: null,
        unit: unit,
        checked: false, // Will be calculated after
        sources: [],
      };
    }

    const group = groups[key];

    // If we have a numeric value, add it.
    if (value !== null) {
      group.quantity = (group.quantity || 0) + value;
    } else if (rawQuantity) {
      // If there's a non-empty quantity string but no number was parsed (like "quelques"),
      // we mark as non-summable for the numeric part (it's already in the unit)
      group.quantity = null;
    }

    group.sources.push({
      ...entry,
      originalQuantity: rawQuantity,
    });
  });

  return Object.values(groups).map((group) => {
    // A group is checked only if ALL its sources are checked
    group.checked = group.sources.every((source) =>
      source.type === "ingredient" ? source.ingredient!.checked : source.item.checked
    );
    return group;
  });
}

/**
 * Formats an aggregated quantity for display.
 */
export function formatAggregatedQuantity(quantity: number | null, unit: string): string {
  if (quantity === null) return unit;
  if (!unit) return quantity === 0 ? "" : quantity.toString();

  // Try to avoid showing ".0" for integers
  const formattedValue = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toFixed(2).replace(/\.?0+$/, "");

  // Add space if unit doesn't look like an abbreviation attached to the number
  const needsSpace = unit.length > 2 || !/^[a-z]+$/i.test(unit);
  return `${formattedValue}${needsSpace ? " " : ""}${unit}`;
}
