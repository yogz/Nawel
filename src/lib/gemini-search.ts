import { google } from "@ai-sdk/google";
import { generateObject, generateText, type Tool } from "ai";
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

const SEARCH_SYSTEM_PROMPT = `Tu es un assistant qui trouve des informations vérifiées sur des événements culturels en France (concerts, théâtre, opéra, expositions, cinéma).

Règles :
- Utilise google_search pour récupérer des infos de sources officielles.
- Priorité d'URL de billetterie (l'app traite mieux les premières) :
  1. Site officiel de la salle (Opéra de Paris, Philharmonie, Comédie-Française, théâtres parisiens, musées…)
  2. Ticketmaster, Shotgun, Dice, See Tickets, Bandsintown
  3. Allociné, Parismusées
  4. En dernier recours seulement : Fnac Spectacles / France Billet (leurs pages bloquent les bots, le pré-remplissage sera dégradé).
- Ne propose QUE des événements à venir (date >= aujourd'hui).
- Réponds en français, en listant explicitement :
  * Nom de l'événement
  * Lieu/salle, ville
  * Date et heure exacte
  * URL complète de la billetterie officielle. CITE L'URL ENTIÈRE, pas un titre cliquable.
  * URL complète d'une affiche / photo officielle (jpg/png/webp). CITE L'URL ENTIÈRE.
- Si tu n'es pas certain, dis-le et n'invente rien.
- Si l'événement n'existe pas, dis-le clairement.`;

const EXTRACT_SYSTEM_PROMPT = `Extrais les informations de l'événement décrit ci-dessous en JSON structuré.

Règles strictes :
- Si une info manque ou est incertaine dans le texte source, laisse le champ vide ("" ou date vide).
- N'invente AUCUNE URL : seules les URL présentes dans le texte source sont valides.
- Format date : ISO 8601 local YYYY-MM-DDTHH:mm sans timezone. Vide si inconnu.
- confidence='high' uniquement si le texte source affirme les infos avec une source officielle citée. Sinon 'low'.
- vibe='autre' si la catégorie n'est pas évidente.`;

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
    // Étape 1 : recherche groundée → texte + sources.
    // L'API Gemini interdit de combiner tool use et response JSON,
    // donc on fait deux appels chaînés. Le 1er bénéficie du free
    // tier grounding (search), le 2nd est de la génération texte
    // standard (gratuite jusqu'au quota Gemini Flash).
    const search = await generateText({
      model: google("gemini-2.5-flash"),
      tools: {
        // Cast: la signature du tool provider Google ne s'aligne pas
        // strictement sur la `ToolSet` de ai v6, mais le runtime accepte.
        google_search: google.tools.googleSearch({}) as unknown as Tool,
      },
      system: SEARCH_SYSTEM_PROMPT,
      prompt: `Trouve les détails de cet événement : "${cleaned}".`,
      abortSignal: AbortSignal.timeout(25_000),
    });

    const sourceUrls = (search.sources ?? [])
      .map((s) => (s.sourceType === "url" ? s.url : null))
      .filter((u): u is string => typeof u === "string");

    logger.debug("[gemini-search] grounded result", {
      query: cleaned,
      sourcesCount: sourceUrls.length,
      textLength: search.text.length,
    });

    if (!search.text || search.text.trim().length < 20) {
      return { found: false, reason: "no_match" };
    }

    // Étape 2 : extraction JSON structurée à partir du texte groundé.
    const sourcesBlock =
      sourceUrls.length > 0 ? `\n\nSources consultées :\n${sourceUrls.join("\n")}` : "";
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: eventSchema,
      system: EXTRACT_SYSTEM_PROMPT,
      prompt: `Texte source :\n${search.text}${sourcesBlock}`,
      abortSignal: AbortSignal.timeout(20_000),
    });

    const validated = validateAgainstSources(object, sourceUrls);
    if (!validated) {
      return { found: false, reason: "low_confidence" };
    }

    return { found: true, data: validated, sources: sourceUrls };
  } catch (error) {
    logger.error("[gemini-search] error", error);
    return { found: false, reason: "error" };
  }
}

// Format ISO local strict : YYYY-MM-DDTHH:mm (pas de timezone, pas de seconds).
const ISO_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function validateAgainstSources(data: EventDetails, _sources: string[]): EventDetails | null {
  if (!data.title || data.title.trim().length === 0) {
    return null;
  }

  const ticketHost = safeHost(data.ticketUrl);
  const imageHost = safeHost(data.heroImageUrl);

  // ticketUrl : on n'utilise pas `sources` car les URL retournées par
  // l'API Gemini pointent vers des redirects vertexaisearch.cloud.google.com.
  // À la place, on valide via la whitelist de domaines billetterie/salles FR
  // connus. Si pas dans la whitelist, on drop et on dégrade la confiance.
  if (data.ticketUrl) {
    if (!ticketHost || !TRUSTED_TICKET_HOSTS.includes(ticketHost)) {
      data.ticketUrl = "";
      data.confidence = "low";
    }
  }

  // heroImageUrl : on accepte n'importe quel HTTPS valide (les images
  // sont souvent sur des CDN tiers), mais on filtre :
  // - les redirects Google grounding (vertexaisearch.cloud.google.com) :
  //   ils ne servent pas d'image directement, ils renvoient un HTML
  // - les pages HTML déguisées (pas d'extension image)
  // - les host sans schéma HTTPS valide
  if (data.heroImageUrl) {
    if (!imageHost || imageHost.endsWith("vertexaisearch.cloud.google.com")) {
      data.heroImageUrl = "";
    } else if (!/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(data.heroImageUrl)) {
      // Pas une vraie URL d'image (probablement une page produit/article).
      data.heroImageUrl = "";
    }
  }

  // Date : exiger ISO local strict, et exclure les événements passés.
  // Un événement passé n'a aucun intérêt pour un wizard de création.
  if (data.startsAt) {
    if (!ISO_LOCAL_RE.test(data.startsAt)) {
      data.startsAt = "";
      data.confidence = "low";
    } else {
      const parsed = new Date(data.startsAt);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now()) {
        data.startsAt = "";
        data.confidence = "low";
      }
    }
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
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return null;
    }
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
