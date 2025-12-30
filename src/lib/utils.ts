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

export function generateGoogleCalendarUrl(
  meal: { date: string; title?: string | null; time?: string | null; address?: string | null },
  eventName: string
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
    details: `Rejoins-nous pour "${title}" sur Nawel !`,
  });

  if (meal.address) {
    params.append("location", meal.address);
  }

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookCalendarUrl(
  meal: { date: string; title?: string | null; time?: string | null; address?: string | null },
  eventName: string
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
    body: `Rejoins-nous pour "${title}" sur Nawel !`,
  });

  if (meal.address) {
    params.append("location", meal.address);
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadIcsFile(
  meal: { date: string; title?: string | null; time?: string | null; address?: string | null },
  eventName: string
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
    "PRODID:-//Nawel//NONSGML v1.0//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:Rejoins-nous pour "${title}" sur Nawel !`,
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

export function getAvatarUrl(user: {
  name?: string | null;
  image?: string | null;
  email?: string | null;
}): string {
  if (user.image) return user.image;

  // Fallback to UI Avatars if no image
  const name = user.name || user.email?.split("@")[0] || "User";
  const params = new URLSearchParams({
    name: name,
    background: "random",
    color: "fff",
    bold: "true",
  });

  return `https://ui-avatars.com/api/?${params.toString()}`;
}
