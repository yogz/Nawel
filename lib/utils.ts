import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PERSON_EMOJIS = [
  // Noël & Hiver
  "🎅", "🤶", "🧑‍🎄", "🧝", "🦌", "⛄", "🏂", "⛸️", "🧣", "🧤", "🧥", "🎻",
  // Fête & Joie
  "🥳", "🤩", "✨", "🎉", "🎊", "🎈", "🎁", "🌟", "🎆", "🎇", "😄", "🥰",
  // Repas & Boissons
  "🥘", "🍴", "🍽️", "🍖", "🍗", "🥧", "🍬", "🍭", "🍪", "🍰", "🧁", "🍩", "🍦",
  "🍷", "🥂", "🍾", "🍹", "🥤"
];

export function getPersonEmoji(name: string, allPeopleNames?: string[], existingEmoji?: string | null): string {
  if (existingEmoji) return existingEmoji;

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
