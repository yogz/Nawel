import type { TicketmasterResult } from "@/features/sortie/lib/ticketmaster-search";
import { toParisDateTime } from "./date-time";

/**
 * Contrôle d'un résultat Ticketmaster trouvé en cherchant le spectacle
 * par son nom (sites de salles sans affiche). Règle du spec 2026-10-27 :
 * une image d'un autre spectacle est pire que pas d'image — on exige que
 * le titre corresponde, et la date quand la page en a donné une.
 */

const MIN_SHARED = 0.6;
const STOP_WORDS = new Set([
  "le",
  "la",
  "les",
  "l",
  "de",
  "du",
  "des",
  "d",
  "et",
  "a",
  "au",
  "aux",
  "en",
  "the",
  "of",
  "and",
]);

function words(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

export function isTicketmasterMatch(
  r: TicketmasterResult,
  page: { title: string; date: string | null }
): boolean {
  const pageWords = words(page.title);
  if (pageWords.length === 0) {
    return false;
  }
  const resultWords = new Set(words(r.title));
  const shared = pageWords.filter((w) => resultWords.has(w)).length;
  if (shared / pageWords.length < MIN_SHARED) {
    return false;
  }
  if (page.date) {
    return toParisDateTime(r.startsAt).date === page.date;
  }
  return true;
}
