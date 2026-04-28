import { google } from "@ai-sdk/google";
import { generateText, type Tool } from "ai";
import { logger } from "./logger";

export type FindImageResult =
  | { found: true; url: string }
  | { found: false; reason: "no_match" | "unreachable" | "error" };

// Hosts qu'on évite de proposer : leurs CDN bloquent le hotlinking
// (Referer / cookies requis), donc même si l'URL HEAD répond 200,
// l'`<img src>` échoue côté client. Inutile de payer un round-trip
// Gemini pour finir avec une image cassée.
const HOTLINK_BLOCKED_HOSTS = [
  "instagram.com",
  "cdninstagram.com",
  "fbcdn.net",
  "facebook.com",
  "scdn.co",
  "tiktokcdn.com",
  "tiktok.com",
  "twimg.com",
  "pbs.twimg.com",
];

// Hosts vers lesquels Google Search redirige systématiquement avant de
// servir le résultat. Ces URL renvoient du HTML, pas une image.
const SEARCH_REDIRECT_HOSTS = [
  "vertexaisearch.cloud.google.com",
  "google.com/url",
  "googleusercontent.com/proxy",
];

const SEARCH_PROMPT = `Tu cherches UNE URL d'image illustrative pour un événement culturel français.

Stratégie (par ordre de préférence) :
1. Affiche / photo officielle de l'événement précis si elle existe et est citée dans une source publique.
2. Photo de la salle / lieu mentionné (façade, scène, intérieur).
3. Image générique illustrative du genre (théâtre, concert, opéra, exposition, cinéma) sur Wikipedia ou un CDN public.

Règles strictes :
- L'URL doit pointer DIRECTEMENT vers une image (jpg / jpeg / png / webp / avif), HTTPS, sans redirect HTML.
- Pas d'URL via vertexaisearch.cloud.google.com, google.com/url, googleusercontent.com/proxy — ces hôtes renvoient du HTML, pas une image.
- Évite Instagram (instagram.com, cdninstagram.com), Facebook (fbcdn.net), Spotify (scdn.co), TikTok, Twitter/X (twimg.com) — leurs CDN bloquent le hotlinking.
- Préfère : upload.wikimedia.org, images.unsplash.com, sites .fr officiels (operadeparis.fr, philharmoniedeparis.fr, theatrechampselysees.fr, ticketmaster.fr…), CDN publics standards.
- Pas d'image dont les droits sont incertains (privilégie Wikipedia Commons, Unsplash, ou les sites officiels qui assument leur usage public).

Réponds UNIQUEMENT par l'URL complète sur une ligne, sans guillemets ni texte autour.
Si tu n'as aucune URL d'image directe certaine, réponds exactement : AUCUNE`;

const URL_RE = /https:\/\/[^\s)>"']+/g;
const IMAGE_PATH_RE = /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i;

const HEAD_TIMEOUT_MS = 4000;

/**
 * Cherche UNE image illustrative pour un événement donné via Gemini
 * grounded search. Beaucoup plus permissif que `findEventDetails` :
 * autorise les images génériques quand pas de visuel officiel, et
 * valide l'URL en HEAD avant de la renvoyer (élimine les images
 * cassées affichées côté client).
 *
 * Use-case : bouton "Rechercher une autre image" du picker, sur la page
 * Modifier d'une sortie existante (titre + venue déjà connus côté DB).
 * Pour le wizard de création qui veut TOUT l'évent, garder
 * `findEventDetails`.
 *
 * Free tier Google AI Studio : ~1500 requêtes/jour.
 */
export async function findEventImage(args: {
  title: string;
  venue?: string;
  vibe?: string;
}): Promise<FindImageResult> {
  const title = args.title.trim().slice(0, 200);
  if (title.length < 3) {
    return { found: false, reason: "no_match" };
  }

  // Compose la query — venue désambiguïse les évents homonymes (Roméo
  // et Juliette à l'Opéra vs en tournée), vibe oriente le fallback
  // générique (cherche "scène théâtre" plutôt que "concert").
  const queryParts = [title];
  if (args.venue && args.venue.trim()) {
    queryParts.push(args.venue.trim().slice(0, 100));
  }
  const userPrompt =
    queryParts.join(" — ") + (args.vibe ? `\nCatégorie : ${args.vibe}.` : "");

  let text: string;
  try {
    const search = await generateText({
      model: google("gemini-2.5-flash"),
      tools: {
        google_search: google.tools.googleSearch({}) as unknown as Tool,
      },
      system: SEARCH_PROMPT,
      prompt: userPrompt,
      abortSignal: AbortSignal.timeout(15_000),
    });
    text = search.text;
  } catch (err) {
    logger.error("[gemini-image-search] generation failed", err);
    return { found: false, reason: "error" };
  }

  if (!text || text.toUpperCase().includes("AUCUNE")) {
    return { found: false, reason: "no_match" };
  }

  const candidates = extractImageUrlCandidates(text);
  if (candidates.length === 0) {
    logger.debug("[gemini-image-search] no candidate URL", { text: text.slice(0, 200) });
    return { found: false, reason: "no_match" };
  }

  // Tente les candidats dans l'ordre de pertinence (Gemini cite
  // typiquement la meilleure URL en premier). On s'arrête sur le
  // premier qui passe le HEAD check — pas la peine de payer plus
  // de round-trips.
  for (const url of candidates) {
    if (await isReachableImage(url)) {
      logger.debug("[gemini-image-search] match", { url });
      return { found: true, url };
    }
    logger.debug("[gemini-image-search] candidate unreachable", { url });
  }

  return { found: false, reason: "unreachable" };
}

/**
 * Extrait les URL HTTPS du texte Gemini, filtre les redirects HTML et
 * les hosts hotlink-blocked, priorise les URL avec extension image
 * visible.
 */
function extractImageUrlCandidates(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  const cleaned = matches
    .map((u) => u.replace(/[.,;:!?]+$/, "")) // strip trailing punctuation
    .filter((u) => {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        if (SEARCH_REDIRECT_HOSTS.some((h) => host.includes(h) || u.includes(h))) {
          return false;
        }
        if (HOTLINK_BLOCKED_HOSTS.some((h) => host.endsWith(h))) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });

  // Dédoublonne et priorise les URL avec extension image visible (plus
  // fiables qu'un lien CDN opaque) sans pour autant exclure ces derniers
  // — ils représentent une part énorme du web actuel.
  const unique = Array.from(new Set(cleaned));
  return unique.sort((a, b) => {
    const aIsImage = IMAGE_PATH_RE.test(a) ? 1 : 0;
    const bIsImage = IMAGE_PATH_RE.test(b) ? 1 : 0;
    return bIsImage - aIsImage;
  });
}

/**
 * Valide qu'une URL pointe sur une image accessible publiquement.
 * Stratégie : HEAD avec timeout 4s, fallback GET Range si HEAD est
 * 405 ou 403 (certains CDN bloquent HEAD). Le check porte sur le
 * statut 2xx ET le content-type qui doit commencer par `image/`.
 *
 * Best-effort : si quoi que ce soit pète (DNS, timeout, exception
 * réseau), on retourne false. Mieux vaut rater une image valide qu'en
 * proposer une cassée.
 */
async function isReachableImage(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Certains CDN renvoient 403 sur Mozilla par défaut ; un UA plus
        // proche d'un navigateur courant maximise les chances.
        "User-Agent":
          "Mozilla/5.0 (compatible; SortieBot/1.0; +https://sortie.colist.fr)",
      },
    });

    if (res.status === 405 || res.status === 403) {
      // HEAD pas supporté (ou bloqué) : essaye GET en lisant juste la
      // tête. Range: bytes=0-1023 limite le payload à 1 KB.
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Range: "bytes=0-1023",
          "User-Agent":
            "Mozilla/5.0 (compatible; SortieBot/1.0; +https://sortie.colist.fr)",
        },
      });
    }

    if (res.status < 200 || res.status >= 300) {
      return false;
    }
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.toLowerCase().startsWith("image/");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
