export type OpenAgendaResult = {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  image: string | null;
  startsAt: string | null;
  ticketUrl: string;
};

const OA_BASE_URL = "https://api.openagenda.com/v2/events";
const OA_PUBLIC_BASE = "https://openagenda.com";
const TIMEOUT_MS = 5000;

type OaMultilingual = Record<string, unknown>;
type OaImageVariant = { filename?: unknown; size?: { width?: unknown } };
type OaImage = { base?: unknown; filename?: unknown; variants?: unknown };
type OaTiming = { begin?: unknown; end?: unknown };
type OaLocation = {
  name?: unknown;
  city?: unknown;
  address?: unknown;
};
type OaEvent = {
  uid?: unknown;
  slug?: unknown;
  title?: unknown;
  image?: unknown;
  timings?: unknown;
  location?: unknown;
  originAgenda?: { slug?: unknown; uid?: unknown };
};

function pickFromMultilingual(field: unknown): string | null {
  if (typeof field === "string") {
    return field.trim() || null;
  }
  if (!field || typeof field !== "object") {
    return null;
  }
  const obj = field as OaMultilingual;
  // Préférence : fr > en > première valeur dispo. La plateforme est
  // française mais quelques agendas (Strasbourg, Lille frontalière…)
  // publient seulement en EN/DE.
  for (const lang of ["fr", "en"]) {
    const value = obj[lang];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  for (const value of Object.values(obj)) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickImage(image: unknown): string | null {
  if (!image || typeof image !== "object") {
    return null;
  }
  const img = image as OaImage;
  const base = typeof img.base === "string" ? img.base : null;
  if (!base) {
    return null;
  }
  // Cherche une variante ≤ 1200px de large (cohérent avec Ticketmaster
  // pour le hero strip /nouvelle — évite les originaux 3 MB).
  if (Array.isArray(img.variants)) {
    let best: { filename: string; width: number } | null = null;
    for (const raw of img.variants) {
      const variant = raw as OaImageVariant;
      const filename = typeof variant?.filename === "string" ? variant.filename : null;
      const width = typeof variant?.size?.width === "number" ? variant.size.width : 0;
      if (!filename || width <= 0 || width > 1200) {
        continue;
      }
      if (!best || width > best.width) {
        best = { filename, width };
      }
    }
    if (best) {
      return base + best.filename;
    }
  }
  // Fallback : le filename principal (image originale).
  if (typeof img.filename === "string" && img.filename.length > 0) {
    return base + img.filename;
  }
  return null;
}

function pickStartsAt(timings: unknown): string | null {
  if (!Array.isArray(timings) || timings.length === 0) {
    return null;
  }
  const first = timings[0] as OaTiming;
  return typeof first?.begin === "string" ? first.begin : null;
}

function pickLocation(location: unknown): { venue: string | null; city: string | null } {
  if (!location || typeof location !== "object") {
    return { venue: null, city: null };
  }
  const loc = location as OaLocation;
  const venue = typeof loc.name === "string" ? loc.name.trim() || null : null;
  const city = typeof loc.city === "string" ? loc.city.trim() || null : null;
  return { venue, city };
}

/**
 * Construit l'URL canonique vers la page événement sur openagenda.com.
 *
 * OpenAgenda ne renvoie pas d'URL dans la réponse JSON — on doit la
 * construire à partir du slug de l'agenda d'origine et du slug de
 * l'événement. Si l'un des deux manque (vieil événement, agenda privé),
 * on tombe sur une URL de recherche pour ne pas casser le flux.
 */
function buildTicketUrl(event: OaEvent): string {
  const eventSlug = typeof event.slug === "string" ? event.slug : null;
  const agendaSlug = typeof event.originAgenda?.slug === "string" ? event.originAgenda.slug : null;
  if (agendaSlug && eventSlug) {
    return `${OA_PUBLIC_BASE}/${agendaSlug}/events/${eventSlug}`;
  }
  const uid = typeof event.uid === "number" || typeof event.uid === "string" ? event.uid : null;
  if (uid !== null) {
    return `${OA_PUBLIC_BASE}/event/${uid}`;
  }
  return OA_PUBLIC_BASE;
}

function mapEvent(event: OaEvent): OpenAgendaResult | null {
  const uid = event.uid;
  const id = typeof uid === "number" ? String(uid) : typeof uid === "string" ? uid : null;
  const title = pickFromMultilingual(event.title);
  if (!id || !title) {
    return null;
  }
  const { venue, city } = pickLocation(event.location);
  return {
    id,
    title,
    venue,
    city,
    image: pickImage(event.image),
    startsAt: pickStartsAt(event.timings),
    ticketUrl: buildTicketUrl(event),
  };
}

/**
 * Best-effort search against the OpenAgenda public events API.
 *
 * Mirrors the contract of `searchTicketmasterEvents` so the two sources
 * peuvent être appelées en parallèle puis dédoublonnées. Retourne un
 * tableau vide pour tout cas d'erreur (clé absente, réseau, 4xx/5xx,
 * payload malformé) — le caller décide quoi afficher.
 *
 * On filtre sur les événements à venir (`relative[]=upcoming`) triés
 * par date pour rester cohérent avec le UX Ticketmaster (`sort=date,asc`).
 */
export async function searchOpenAgendaEvents(
  query: string,
  limit: number
): Promise<OpenAgendaResult[]> {
  const apiKey = process.env.OPENAGENDA_API_KEY;
  if (!apiKey) {
    return [];
  }

  const url = new URL(OA_BASE_URL);
  url.searchParams.append("search[]", query);
  url.searchParams.append("relative[]", "upcoming");
  url.searchParams.set("sort", "timings.asc");
  url.searchParams.set("size", String(limit));
  url.searchParams.set("monolingual", "fr");

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Header `key` recommandé par la doc — évite de laisser la clé
      // dans les logs Vercel/CDN comme le ferait `?key=`.
      headers: { Accept: "application/json", key: apiKey },
    });
    if (!response.ok) {
      console.warn("[openagenda] non-2xx", response.status);
      return [];
    }
    const data = (await response.json()) as { events?: unknown };
    const eventsRaw = data.events;
    if (!Array.isArray(eventsRaw)) {
      return [];
    }
    const results: OpenAgendaResult[] = [];
    for (const raw of eventsRaw) {
      const mapped = mapEvent(raw as OaEvent);
      if (mapped) {
        results.push(mapped);
      }
      if (results.length >= limit) {
        break;
      }
    }
    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.warn("[openagenda] fetch failed:", message);
    return [];
  }
}
