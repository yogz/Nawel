import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const THEME_EMOJIS: Record<string, string[]> = {
  christmas: [
    "🎅",
    "🤶",
    "🧑‍🎄",
    "🧝",
    "🧝‍♂️",
    "🦌",
    "⛄",
    "🏂",
    "⛸️",
    "🧣",
    "🧤",
    "🎻",
    "🏔️",
    "⛷️",
    "🥨",
    "🍬",
    "🍭",
    "🍪",
    "🍫",
    "🎿",
  ],
  aurora: [
    "✨",
    "🌟",
    "🎆",
    "🎇",
    "⭐",
    "🌙",
    "🌈",
    "🔮",
    "🧿",
    "🕯️",
    "🌌",
    "🛸",
    "👾",
    "🤩",
    "🦄",
    "🦋",
    "🧪",
    "🧬",
    "🚀",
    "🤖",
    "👨‍🚀",
    "🦸‍♂️",
    "🧙‍♂️",
    "🥷",
  ],
  classic: [
    "🥘",
    "🍴",
    "🍽️",
    "🍖",
    "🍗",
    "🥧",
    "🍷",
    "🥂",
    "🍾",
    "🍹",
    "🥤",
    "🥳",
    "🤩",
    "🎉",
    "🎊",
    "🎈",
    "🎁",
    "😄",
    "🥰",
    "😎",
    "🧔",
    "👨‍🍳",
    "🤵",
    "🕺",
  ],
};

/**
 * Returns the display name for a person.
 * Priority: User Name (Google profile) > Person Name (manual)
 */
export function getDisplayName(person: { name: string }): string {
  // Now decoupled: person.name is the source of truth for guests
  return person.name;
}

/**
 * Renders the avatar (image or emoji) for a person.
 * Priority: User Image > User Emoji > Manually Set Guest Emoji > Dynamic Theme Fallback
 */
export function renderAvatar(
  person: {
    name: string;
    emoji?: string | null;
    image?: string | null;
    user?: { image?: string | null; emoji?: string | null } | null;
  },
  allPeopleNames: string[] = [],
  theme: string = "aurora"
): { type: "image"; src: string } | { type: "emoji"; value: string } {
  // 1. Guest/User Emoji (Explicit choice)
  // Check the entity's own emoji or the associated user's emoji (for profile nav)
  const emoji = person.emoji || person.user?.emoji;
  if (emoji) {
    return { type: "emoji", value: emoji };
  }

  // 2. Guest Image (Explicit photo choice)
  if (person.image) {
    return { type: "image", src: person.image };
  }

  // 3. User Social Image (Social fallback)
  if (person.user?.image) {
    return { type: "image", src: person.user.image };
  }

  // 4. Dynamic Fallback
  return { type: "emoji", value: getPersonEmoji(person.name, allPeopleNames, null, theme) };
}

export function getPersonEmoji(
  name: string,
  allPeopleNames?: string[],
  existingEmoji?: string | null,
  theme: string = "aurora"
): string {
  if (existingEmoji) {
    return existingEmoji;
  }

  // Determine which emoji set to use
  let emojiSet = THEME_EMOJIS.classic;
  if (theme === "christmas") {
    emojiSet = THEME_EMOJIS.christmas;
  } else if (theme === "aurora") {
    emojiSet = THEME_EMOJIS.aurora;
  }

  if (allPeopleNames && allPeopleNames.length > 0) {
    const uniqueNames = Array.from(new Set(allPeopleNames)).sort();
    const index = uniqueNames.indexOf(name);
    if (index >= 0 && index < emojiSet.length) {
      return emojiSet[index % emojiSet.length];
    }
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % emojiSet.length;
  return emojiSet[index];
}

export function generateGoogleCalendarUrl(
  meal: { date: string; title?: string | null; time?: string | null; address?: string | null },
  eventName: string,
  description: string
) {
  const title = meal.title ? `${eventName} - ${meal.title}` : eventName;
  const dateStr = meal.date.replace(/-/g, ""); // "YYYYMMDD"

  let start = `${dateStr}T120000`;
  let end = `${dateStr}T140000`;

  if (meal.time) {
    const [hours, minutes] = meal.time.split(":");
    const h = hours.padStart(2, "0");
    const m = minutes.padStart(2, "0");
    start = `${dateStr}T${h}${m}00`;
    const endH = (parseInt(h) + 2).toString().padStart(2, "0");
    end = `${dateStr}T${endH}${m}00`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: description,
  });

  if (meal.address) {
    params.append("location", meal.address);
  }

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookCalendarUrl(
  meal: { date: string; title?: string | null; time?: string | null; address?: string | null },
  eventName: string,
  description: string
) {
  const title = meal.title ? `${eventName} - ${meal.title}` : eventName;
  const dateStr = meal.date; // "YYYY-MM-DD"

  let startTime = "12:00:00";
  let endTime = "14:00:00";

  if (meal.time) {
    startTime = `${meal.time}:00`;
    const [h, m] = meal.time.split(":");
    endTime = `${(parseInt(h) + 2).toString().padStart(2, "0")}:${m}:00`;
  }

  const startdt = `${dateStr}T${startTime}`;
  const enddt = `${dateStr}T${endTime}`;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt,
    enddt,
    body: description,
  });

  if (meal.address) {
    params.append("location", meal.address);
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadIcsFile(
  meal: { date: string; title?: string | null; time?: string | null; address?: string | null },
  eventName: string,
  description: string
) {
  const title = meal.title ? `${eventName} - ${meal.title}` : eventName;
  const dateStr = meal.date.replace(/-/g, "");

  let start = `${dateStr}T120000`;
  let end = `${dateStr}T140000`;

  if (meal.time) {
    const [h, m] = meal.time.split(":");
    start = `${dateStr}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
    const endH = (parseInt(h) + 2).toString().padStart(2, "0");
    end = `${dateStr}T${endH}${m.padStart(2, "0")}00`;
  }

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CoList//NONSGML v1.0//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    meal.address ? `LOCATION:${meal.address}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const icsString = icsLines.join("\r\n");
  const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Returns an appropriate emoji for a service based on its title.
 */
export function getServiceIcon(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized.includes("apero") ||
    normalized.includes("boisson") ||
    normalized.includes("vin") ||
    normalized.includes("champagne") ||
    normalized.includes("biere") ||
    normalized.includes("cocktail") ||
    normalized.includes("soft") ||
    normalized.includes("jus") ||
    normalized.includes("aperitif")
  ) {
    return "🥂";
  }

  if (
    normalized.includes("dessert") ||
    normalized.includes("gateau") ||
    normalized.includes("buche") ||
    normalized.includes("sucre") ||
    normalized.includes("douceur") ||
    normalized.includes("mignardise") ||
    normalized.includes("fruit") ||
    normalized.includes("goute")
  ) {
    return "🍰";
  }

  if (normalized.includes("fromage") || normalized.includes("cheese")) {
    return "🧀";
  }

  if (
    normalized.includes("entree") ||
    normalized.includes("salade") ||
    normalized.includes("amuse-bouche") ||
    normalized.includes("starter") ||
    normalized.includes("tapas")
  ) {
    return "🥗";
  }

  if (
    normalized.includes("plat") ||
    normalized.includes("principal") ||
    normalized.includes("viande") ||
    normalized.includes("poisson") ||
    normalized.includes("main")
  ) {
    return "🍽️";
  }

  if (
    normalized.includes("cafe") ||
    normalized.includes("the") ||
    normalized.includes("petit dej") ||
    normalized.includes("morning") ||
    normalized.includes("petit-dejeuner")
  ) {
    return "☕";
  }

  if (
    normalized.includes("pain") ||
    normalized.includes("boulangerie") ||
    normalized.includes("baguette") ||
    normalized.includes("galette")
  ) {
    return "🥖";
  }

  if (
    normalized.includes("musique") ||
    normalized.includes("dance") ||
    normalized.includes("son") ||
    normalized.includes("party")
  ) {
    return "🎵";
  }

  if (
    normalized.includes("cadeau") ||
    normalized.includes("gift") ||
    normalized.includes("surprise")
  ) {
    return "🎁";
  }

  if (
    normalized.includes("deco") ||
    normalized.includes("ambiance") ||
    normalized.includes("fleurs") ||
    normalized.includes("etincelle")
  ) {
    return "✨";
  }

  if (normalized.includes("midi") || normalized.includes("soir")) {
    return "🍽️";
  }

  // Default fallback
  return "🍴";
}
