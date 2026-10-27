/**
 * Date et heure d'un spectacle, en heure de Paris, calculées côté serveur.
 *
 * Avant : la route renvoyait `startsAt` brut et le wizard faisait
 * `new Date(startsAt).getHours()`. Une date sans heure (`"2026-06-18"`,
 * JSON-LD du Châtelet / Grand Palais) devenait minuit UTC, affiché
 * « 02:00 » à Paris en été — une heure fausse présentée avec assurance.
 * Règle (spec 2026-10-27) : mieux vaut une heure vide qu'une heure fausse.
 */

export type ParisDateTime = { date: string | null; time: string | null };

const EMPTY: ParisDateTime = { date: null, time: null };

const parisParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const pad = (n: number | string) => String(n).padStart(2, "0");

function validDate(y: string, m: string, d: string): boolean {
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return dt.getUTCMonth() === Number(m) - 1 && dt.getUTCDate() === Number(d);
}

export function toParisDateTime(raw: string | null | undefined): ParisDateTime {
  const s = (raw ?? "").trim();
  // « 2026-06-18T00:00:00.000Z » : une date seule sérialisée en JS
  // (toISOString), pas un spectacle à 2 h du matin. On garde le jour écrit.
  const utcMidnight = /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.0+)?)?Z$/.exec(s);
  if (utcMidnight) {
    return validDate(utcMidnight[1]!, utcMidnight[2]!, utcMidnight[3]!)
      ? { date: `${utcMidnight[1]}-${utcMidnight[2]}-${utcMidnight[3]}`, time: null }
      : EMPTY;
  }
  const parsed = parseDateTime(s);
  // Minuit = « heure inconnue » dans la quasi-totalité des données
  // publiées ; mieux vaut une heure vide qu'une séance à 00:00.
  return parsed.time === "00:00" ? { date: parsed.date, time: null } : parsed;
}

function parseDateTime(s: string): ParisDateTime {
  // Compact « 20270508T19:30:0 » (Paris La Défense Arena), lu comme heure de Paris.
  let m = /^(\d{4})(\d{2})(\d{2})T(\d{1,2}):?(\d{2})/.exec(s);
  if (m) {
    return validDate(m[1]!, m[2]!, m[3]!)
      ? { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${pad(m[4]!)}:${m[5]}` }
      : EMPTY;
  }
  // Date seule : pas d'heure inventée.
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return validDate(m[1]!, m[2]!, m[3]!) ? { date: s, time: null } : EMPTY;
  }
  // Date + heure sans fuseau, ou avec un décalage « ±hh:mm » : on garde
  // l'heure telle qu'écrite par la page — l'heure locale du spectacle.
  // Pour une salle française c'est l'heure de Paris ; pour une salle à
  // l'étranger c'est l'heure annoncée sur place ; et un décalage faux
  // (Sohoplace à Londres publie « 19:00-04:00 ») ne décale plus la date.
  m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:[+-]\d{2}:?\d{2})?$/.exec(
    s
  );
  if (m) {
    return validDate(m[1]!, m[2]!, m[3]!)
      ? { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` }
      : EMPTY;
  }
  // Heure UTC (« …Z », Ticketmaster) : pas d'heure locale écrite, on
  // convertit en heure de Paris.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*Z$/.test(s)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      return EMPTY;
    }
    const p = Object.fromEntries(parisParts.formatToParts(d).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  }
  return EMPTY;
}

/**
 * « 2026-06-18 » → Date locale à minuit de ce jour (calendrier du wizard).
 * `new Date("2026-06-18")` serait minuit UTC, donc la veille au soir à
 * l'ouest de Greenwich.
 */
export function localDateFromIsoDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

const MONTHS: string[][] = [
  ["janvier", "janv"],
  ["fevrier", "fevr", "fev"],
  ["mars"],
  ["avril", "avr"],
  ["mai"],
  ["juin"],
  ["juillet", "juil"],
  ["aout"],
  ["septembre", "sept"],
  ["octobre", "oct"],
  ["novembre", "nov"],
  ["decembre", "dec"],
];

// Fenêtre après une mention de la date où l'heure du spectacle est cherchée.
const WINDOW = 80;
const LOOKBACK = 25;
// Une heure précédée de ces mots n'est pas celle du spectacle.
const NOT_SHOW_TIME = /duree|ouverture|portes|doors|duration/;
// « 1h30 » sans mot-clé est une durée, pas une séance à 1 h du matin.
const EARLIEST_SHOW_HOUR = 8;

function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Heure du spectacle écrite près de la date dans le texte de la page
 * (« mercredi 11 novembre 2026 à 20h », « 11/11/2026 – 20h30 »). Renvoie
 * null dès qu'il y a ambiguïté : plusieurs heures différentes près de la
 * date (ouverture des portes, autre représentation), ou date absente.
 */
export function findShowTime(text: string, date: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m || !text) {
    return null;
  }
  const day = String(Number(m[3]));
  const month = Number(m[2]);
  const t = fold(text);
  const names = MONTHS[month - 1]!.join("|");
  const mention = new RegExp(
    `\\b0?${day}(?:er)?\\s+(?:${names})\\.?(?:\\s+\\d{4})?|\\b0?${day}[/.-]0?${month}(?:[/.-](?:\\d{4}|\\d{2}))?\\b`,
    "g"
  );
  const times = new Set<string>();
  for (const hit of t.matchAll(mention)) {
    const start = hit.index! + hit[0].length;
    const window = t.slice(start, start + WINDOW);
    let lastEnd = 0;
    for (const tm of window.matchAll(/\b([01]?\d|2[0-3])\s?(?:h\s?([0-5]\d)?|:([0-5]\d))/g)) {
      // Texte juste avant cette heure (depuis l'heure précédente) : une
      // durée ou l'ouverture des portes n'est pas l'heure du spectacle.
      const before = window.slice(Math.max(lastEnd, tm.index! - LOOKBACK), tm.index!);
      lastEnd = tm.index! + tm[0].length;
      if (NOT_SHOW_TIME.test(before) || Number(tm[1]) < EARLIEST_SHOW_HOUR) {
        continue;
      }
      times.add(`${pad(tm[1]!)}:${tm[2] ?? tm[3] ?? "00"}`);
    }
  }
  return times.size === 1 ? [...times][0]! : null;
}
