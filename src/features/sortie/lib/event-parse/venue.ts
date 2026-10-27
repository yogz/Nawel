import { decodeHtmlEntities, looksLikeVenue } from "./extract-page";

/**
 * Choix du nom de salle affiché pour une sortie créée depuis un lien.
 *
 * Constat (spec 2026-10-27 §2) : sur le site d'une salle, la page ne
 * nomme pas sa propre salle comme lieu, ou donne une salle interne
 * (« Grande Salle » au Châtelet) voire une adresse (Grand Palais). Le
 * vrai nom est le plus souvent dans `og:site_name`, ou se déduit du site.
 */

// Salles fréquentes dont le site ne donne pas de nom exploitable (aucun
// site_name, ou un identifiant en minuscules). Clé = host sans « www. ».
export const VENUE_HOST_NAMES: Record<string, string> = {
  "accorarena.com": "Accor Arena",
  "adidasarena.com": "Adidas Arena",
  "philharmoniedeparis.fr": "Philharmonie de Paris",
  "theatremarigny.fr": "Théâtre Marigny",
  "billetterie.theatremarigny.fr": "Théâtre Marigny",
  "chatelet.com": "Théâtre du Châtelet",
  "olympiahall.com": "L'Olympia",
  "sallepleyel.com": "Salle Pleyel",
  "le-zenith.com": "Zénith Paris - La Villette",
  "parisladefense-arena.com": "Paris La Défense Arena",
  "theatredeloeuvre.com": "Théâtre de l'Œuvre",
  "theatredesmathurins.com": "Théâtre des Mathurins",
  "theatremontparnasse.com": "Théâtre Montparnasse",
  "bataclan.fr": "Bataclan",
  "grandpalais.fr": "Grand Palais",
  "38riv.com": "38Riv Jazz Club & Bar",
};

// Billetteries : leur og:site_name est leur propre nom, jamais la salle.
const TICKETING_HOSTS = [
  "billetreduc.com",
  "ticketmaster.fr",
  "ticketmaster.gr",
  "digitick.com",
  "shotgun.live",
  "fnacspectacles.com",
  "fnacspectacles.fr",
  "seetickets.com",
  "talticket.com",
  "eventbrite.fr",
  "weezevent.com",
  "billetweb.fr",
];

const INTERNAL_HALL = /^(?:(?:grande|petite)\s+salle\b|salle\s+\d+\b|studio\b)/i;
const STREET =
  /^\d+\s*(?:bis|ter)?,?\s+(?:rue|avenue|av\.?|bd|boulevard|place|quai|all[ée]e|chemin|impasse|cours|route)\b/i;

export function isUnusableVenueName(name: string): boolean {
  const n = name.trim();
  return INTERNAL_HALL.test(n) || STREET.test(n) || /\b\d{5}\b/.test(n);
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isTicketingHost(host: string): boolean {
  return TICKETING_HOSTS.some((t) => host === t || host.endsWith(`.${t}`));
}

function cleanName(raw: string): string {
  return decodeHtmlEntities(raw)
    .trim()
    .replace(/^@/, "")
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}

/**
 * Ordre : salle JSON-LD exploitable > nom connu du site de la salle >
 * og:site_name (si le site n'est pas une billetterie et qu'il nomme une
 * salle, ou que la page a donné une salle interne) > salle déduite par
 * l'extraction existante (titre « NOAM · L'Européen », description).
 */
export function pickVenue(c: {
  jsonLdVenue?: string;
  siteName?: string;
  legacyVenue?: string;
  hostname: string;
}): string | undefined {
  const host = bareHost(c.hostname);
  const jsonLdVenue = c.jsonLdVenue ? cleanName(c.jsonLdVenue) : undefined;
  if (isTicketingHost(host)) {
    // Sur une billetterie seule une salle JSON-LD exploitable est fiable.
    return jsonLdVenue && !isUnusableVenueName(jsonLdVenue) ? jsonLdVenue : undefined;
  }
  if (jsonLdVenue && !isUnusableVenueName(jsonLdVenue)) {
    return jsonLdVenue;
  }
  const known = VENUE_HOST_NAMES[host];
  if (known) {
    return known;
  }
  if (c.siteName) {
    const site = cleanName(c.siteName);
    const internalHallGiven = Boolean(jsonLdVenue);
    if (site && !isUnusableVenueName(site) && (looksLikeVenue(site) || internalHallGiven)) {
      return site;
    }
  }
  if (c.legacyVenue && !isUnusableVenueName(c.legacyVenue)) {
    return c.legacyVenue;
  }
  return undefined;
}
