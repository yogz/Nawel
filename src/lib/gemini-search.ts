import { google } from "@ai-sdk/google";
import { generateText, Output, stepCountIs, type Tool } from "ai";
import { z } from "zod";
import { logger } from "./logger";

const VIBE_VALUES = ["theatre", "opera", "concert", "cine", "expo", "autre"] as const;

// Domaines de billetterie / institutions culturelles FR jugés fiables.
// Une `ticketUrl` qui ne pointe pas vers un de ces hôtes est dégradée
// en confidence: "low" pour limiter les hallucinations.
const TRUSTED_TICKET_HOSTS = [
  "ticketmaster.fr",
  "fnacspectacles.com",
  "fnac.com",
  "shotgun.live",
  "dice.fm",
  "seetickets.com",
  "bandsintown.com",
  "operadeparis.fr",
  "opera-comique.com",
  "theatrechampselysees.fr",
  "comedie-francaise.fr",
  "allocine.fr",
  "ugc.fr",
  "mk2.com",
  "parismusees.paris.fr",
  "billetterie.parismusees.paris.fr",
  "centrepompidou.fr",
  "louvre.fr",
  "philharmoniedeparis.fr",
  "lavillette.com",
  "salle-pleyel.com",
  "olympiahall.com",
  "zenith-paris.com",
  "accorhotelsarena.com",
  "weezevent.com",
  "yurplan.com",
  "billetreduc.com",
];

const eventSchema = z.object({
  title: z.string().min(1).max(200).describe("Nom officiel de l'événement"),
  venue: z.string().max(200).describe("Salle, théâtre, musée, club. Vide si inconnu."),
  city: z.string().max(100).describe("Ville en France. Vide si inconnu."),
  startsAt: z
    .string()
    .describe("Date et heure ISO 8601 locale (YYYY-MM-DDTHH:mm). Vide si inconnu."),
  ticketUrl: z
    .string()
    .describe(
      "URL officielle de billetterie ou de la page événement. Vide si pas de source fiable."
    ),
  heroImageUrl: z
    .string()
    .describe("URL d'une image officielle (affiche, photo). Vide si pas trouvé."),
  vibe: z.enum(VIBE_VALUES).describe("Catégorie culturelle. 'autre' si ambigu."),
  confidence: z
    .enum(["high", "low"])
    .describe("'high' si toutes les infos viennent de sources officielles citées, 'low' sinon."),
});

export type EventDetails = z.infer<typeof eventSchema>;

export type FindEventResult =
  | { found: true; data: EventDetails; sources: string[] }
  | { found: false; reason: "no_match" | "low_confidence" | "error" };

const SYSTEM_PROMPT = `Tu es un assistant qui trouve des informations vérifiées sur des événements culturels en France (concerts, théâtre, opéra, expositions, cinéma).

Règles strictes :
- Utilise google_search pour vérifier chaque information.
- Ne devine JAMAIS une URL, une date ou un lieu. Si tu n'es pas certain à partir d'une source officielle (site de la salle, billetterie reconnue, page officielle de l'artiste), laisse le champ vide.
- Privilégie les billetteries reconnues : Fnac Spectacles, Ticketmaster, Shotgun, Dice, sites des salles (Opéra de Paris, Philharmonie, etc.), Allociné, Parismusées.
- La date doit être au format ISO 8601 local (YYYY-MM-DDTHH:mm) sans timezone.
- L'image doit être l'affiche ou la photo officielle de l'événement, hébergée sur le site officiel.
- confidence='high' uniquement si TOUTES les infos non vides viennent de sources officielles que tu as réellement consultées via google_search.`;

/**
 * Cherche les détails d'un événement culturel en France via Gemini grounding.
 * Fallback ultime du wizard quand le parsing URL et la recherche Ticketmaster
 * n'ont rien retourné. Free tier Google AI Studio : ~1500 requêtes/jour.
 *
 * Usage server-side uniquement (la clé GOOGLE_GENERATIVE_AI_API_KEY est secrète).
 */
export async function findEventDetails(query: string): Promise<FindEventResult> {
  const cleaned = query.trim().slice(0, 300);
  if (cleaned.length < 3) {
    return { found: false, reason: "no_match" };
  }

  try {
    const { output, sources, providerMetadata } = await generateText({
      model: google("gemini-2.5-flash"),
      tools: {
        // Cast: la signature du tool provider Google ne s'aligne pas
        // strictement sur la `ToolSet` de ai v6, mais le runtime accepte.
        google_search: google.tools.googleSearch({}) as unknown as Tool,
      },
      system: SYSTEM_PROMPT,
      prompt: `Trouve les détails de cet événement : "${cleaned}".`,
      output: Output.object({ schema: eventSchema }),
      stopWhen: stepCountIs(5),
      abortSignal: AbortSignal.timeout(10_000),
    });

    const sourceUrls = (sources ?? [])
      .map((s) => (s.sourceType === "url" ? s.url : null))
      .filter((u): u is string => typeof u === "string");

    logger.debug("[gemini-search] grounded result", {
      query: cleaned,
      sourcesCount: sourceUrls.length,
      groundingMetadata: providerMetadata?.google,
    });

    const validated = validateAgainstSources(output, sourceUrls);
    if (!validated) {
      return { found: false, reason: "low_confidence" };
    }

    return { found: true, data: validated, sources: sourceUrls };
  } catch (error) {
    logger.error("[gemini-search] error", error);
    return { found: false, reason: "error" };
  }
}

function validateAgainstSources(data: EventDetails, sources: string[]): EventDetails | null {
  if (!data.title || data.title.trim().length === 0) {
    return null;
  }

  const sourceHosts = new Set(sources.map(safeHost).filter(Boolean) as string[]);
  const ticketHost = safeHost(data.ticketUrl);
  const imageHost = safeHost(data.heroImageUrl);

  // Si la ticketUrl n'a pas été vue dans les sources ET ne pointe pas
  // vers un domaine reconnu, on la dégrade plutôt que de la propager.
  if (
    data.ticketUrl &&
    ticketHost &&
    !sourceHosts.has(ticketHost) &&
    !TRUSTED_TICKET_HOSTS.includes(ticketHost)
  ) {
    data.ticketUrl = "";
    data.confidence = "low";
  }

  // Même règle pour l'image : doit venir d'une source consultée.
  if (data.heroImageUrl && imageHost && !sourceHosts.has(imageHost)) {
    data.heroImageUrl = "";
  }

  // Si après nettoyage il ne reste qu'un titre seul, c'est trop maigre.
  const populatedFields = [data.venue, data.startsAt, data.ticketUrl].filter(
    (v) => v && v.length > 0
  );
  if (populatedFields.length === 0) {
    return null;
  }

  return data;
}

function safeHost(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
