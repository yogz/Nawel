export const PERSON_EMOJIS = [
    "🎅", "🤶", "🧑‍🎄", "🧝", "🦌", "⛄", "🏂", "⛸️", "🧣", "🧤",
    "🧥", "🥘", "🥧", "🍬", "🍭", "🍪", "🥛", "🍷", "🥂", "🎻"
];

/**
 * Get a unique emoji for a person within an event.
 * Ensures emojis are unique per event by using the person's position in a sorted list of unique names.
 */
export function getPersonEmoji(name: string, allPeopleNames?: string[], existingEmoji?: string | null): string {
    if (existingEmoji) return existingEmoji;

    // If we have the list of all people, ensure uniqueness per event
    if (allPeopleNames && allPeopleNames.length > 0) {
        // Get unique names to ensure each name gets a unique emoji
        const uniqueNames = Array.from(new Set(allPeopleNames)).sort();
        const index = uniqueNames.indexOf(name);
        if (index >= 0 && index < PERSON_EMOJIS.length) {
            return PERSON_EMOJIS[index % PERSON_EMOJIS.length];
        }
        // If name not found (shouldn't happen), fallback to hash
    }

    // Fallback: use hash-based assignment (may have collisions but works without full list)
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PERSON_EMOJIS.length;
    return PERSON_EMOJIS[index];
}
