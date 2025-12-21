const PERSON_EMOJIS = [
    "🎅", "🤶", "🧑‍🎄", "🧝", "🦌", "⛄", "🏂", "⛸️", "🧣", "🧤",
    "🧥", "🥘", "🥧", "🍬", "🍭", "🍪", "🥛", "🍷", "🥂", "🎻"
];

export function getPersonEmoji(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PERSON_EMOJIS.length;
    return PERSON_EMOJIS[index];
}
