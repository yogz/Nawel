import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PERSON_EMOJIS = [
  // Noël & Hiver
  "🎅",
  "🤶",
  "🧑‍🎄",
  "🧝",
  "🦌",
  "⛄",
  "🏂",
  "⛸️",
  "🧣",
  "🧤",
  "🧥",
  "🎻",
  // Fête & Joie
  "🥳",
  "🤩",
  "✨",
  "🎉",
  "🎊",
  "🎈",
  "🎁",
  "🌟",
  "🎆",
  "🎇",
  "😄",
  "🥰",
  // Repas & Boissons
  "🥘",
  "🍴",
  "🍽️",
  "🍖",
  "🍗",
  "🥧",
  "🍬",
  "🍭",
  "🍪",
  "🍰",
  "🧁",
  "🍩",
  "🍦",
  "🍷",
  "🥂",
  "🍾",
  "🍹",
  "🥤",
];

export function getPersonEmoji(
  name: string,
  allPeopleNames?: string[],
  existingEmoji?: string | null
): string {
  if (existingEmoji) {
    return existingEmoji;
  }

  if (allPeopleNames && allPeopleNames.length > 0) {
    const uniqueNames = Array.from(new Set(allPeopleNames)).sort();
    const index = uniqueNames.indexOf(name);
    if (index >= 0 && index < PERSON_EMOJIS.length) {
      return PERSON_EMOJIS[index % PERSON_EMOJIS.length];
    }
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PERSON_EMOJIS.length;
  return PERSON_EMOJIS[index];
}

/**
 * Scales a quantity string based on a ratio of people.
 * Example: "500g" for 4 people scaled to 8 people -> "1000g"
 */
export function scaleQuantity(
  quantity: string | null,
  oldPeopleCount: number,
  newPeopleCount: number
): string | null {
  if (!quantity || oldPeopleCount <= 0 || newPeopleCount === oldPeopleCount) return quantity;

  const ratio = newPeopleCount / oldPeopleCount;

  // Regex to find numbers (supporting decimals with . or ,)
  // We avoid replacing numbers that look like years or part of a word if possible,
  // but for quantities, usually, numbers are what we want to scale.
  return quantity.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(",", "."));
    if (isNaN(num)) return match;

    const scaled = num * ratio;

    // Beautifully format the number
    // If it's an integer, keep it as integer.
    // If it has decimals, keep up to 2.
    let formatted: string;
    if (Number.isInteger(scaled)) {
      formatted = scaled.toString();
    } else {
      formatted = scaled.toFixed(2).replace(/\.?0+$/, "");
    }

    // Restore original decimal separator if it was a comma
    if (match.includes(",")) {
      return formatted.replace(".", ",");
    }
    return formatted;
  });
}
