import type { PageData } from "./extract-page";

/**
 * Détection des images « de site » que les pages de salles exposent en
 * og:image à la place de l'affiche du spectacle : logo de la salle, image
 * SEO commune, photo de foule partagée par tous les concerts, vignette
 * minuscule. Relevé sur les vraies sorties (spec 2026-10-27 §2) : 5 images
 * sur 14 remplacées à la main étaient de ce type, comptées pourtant comme
 * « image trouvée ».
 *
 * Heuristique sur l'URL seule (pas de fetch de l'image) : un faux négatif
 * laisse passer un logo comme aujourd'hui, un faux positif fait retomber
 * sur la recherche par le nom puis sur le panneau de secours.
 */

const MIN_WIDTH = 400;

// Sous-chaînes du nom de fichier qui trahissent une image de site.
const GENERIC_SUBSTRINGS = ["logo", "placeholder", "favicon", "vignette", "thumb"];
// Mots isolés (trop courts pour une recherche en sous-chaîne : « seo »
// apparaît dans « museo »).
const GENERIC_TOKENS = new Set(["seo", "share", "default", "og", "temp"]);
// Mots trop communs pour signaler à eux seuls le nom de la salle.
const COMMON_WORDS = new Set([
  "theatre",
  "theater",
  "salle",
  "arena",
  "opera",
  "paris",
  "concert",
  "musee",
  "museum",
  "cinema",
  "spectacle",
  "spectacles",
  "billetterie",
]);

function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Billetteries : leur nom figure souvent sur de vraies affiches
// (« ANNAxOAKA_TICKETMASTER »), ce n'est pas le signe d'une image de salle.
const TICKETING_WORDS = new Set([
  "ticketmaster",
  "billetreduc",
  "digitick",
  "shotgun",
  "fnacspectacles",
  "seetickets",
  "eventbrite",
  "weezevent",
  "billetweb",
  "talticket",
]);

/** Mots distinctifs du nom de la salle / du site (≥ 6 lettres, hors mots communs). */
function brandTokens(siteName: string | undefined, hostname: string): string[] {
  const hostLabel = hostname.replace(/^www\./, "").split(".")[0] ?? "";
  const words = fold(`${siteName ?? ""} ${hostLabel}`).split(/[^a-z0-9]+/);
  return words.filter((w) => w.length >= 6 && !COMMON_WORDS.has(w) && !TICKETING_WORDS.has(w));
}

/** Mots du titre du spectacle assez distinctifs pour être cherchés dans un nom de fichier. */
function titleTokens(title: string | undefined): string[] {
  return fold(title ?? "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !COMMON_WORDS.has(w));
}

export function isGenericImageUrl(
  url: string,
  ctx: { siteName?: string; hostname: string; declaredWidth?: number; title?: string }
): boolean {
  if (ctx.declaredWidth !== undefined && ctx.declaredWidth < MIN_WIDTH) {
    return true;
  }
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return true;
  }
  const file = fold(decodeURIComponent(pathname.split("/").pop() ?? ""));
  if (/\.svg$/.test(file)) {
    return true;
  }
  // Suffixe de taille « _110.png » / « -150x150.jpg » sous le seuil.
  const size = /[_-](\d{2,3})(?:x\d{2,3})?\.(?:png|jpe?g|webp|gif)$/.exec(file);
  if (size && Number(size[1]) < MIN_WIDTH) {
    return true;
  }
  if (GENERIC_SUBSTRINGS.some((s) => file.includes(s))) {
    return true;
  }
  const tokens = file.split(/[^a-z0-9]+/);
  if (tokens.some((t) => GENERIC_TOKENS.has(t))) {
    return true;
  }
  // Nom de la salle dans le fichier (« photo-concert-plenitude-arena-foule ») :
  // image de salle, SAUF si le fichier cite aussi le spectacle
  // (« …hilma_af_klint_grandpalais… » est bien l'affiche de l'expo).
  const compact = file.replace(/[^a-z0-9]/g, "");
  const citesVenue = brandTokens(ctx.siteName, ctx.hostname).some((b) => compact.includes(b));
  const citesShow = titleTokens(ctx.title).some((t) => compact.includes(t));
  return citesVenue && !citesShow;
}

function absolutize(raw: string, pageUrl: URL): string | undefined {
  try {
    // Le JSON-LD du Châtelet concatène base + URL absolue
    // (« https://www.chatelet.comhttps://www.chatelet.com/app/… ») : on
    // garde la dernière URL absolue de la chaîne.
    const lastAbsolute = raw.search(/https?:\/\/(?!.*https?:\/\/)/i);
    const u = new URL(lastAbsolute > 0 ? raw.slice(lastAbsolute) : raw, pageUrl);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Affiche du spectacle exposée par la page : image du JSON-LD Event
 * d'abord (propre à l'événement), puis og:image / twitter:image, la
 * première qui n'est pas une image de site.
 */
export function pickPageImage(
  page: Pick<PageData, "jsonLdImage" | "image" | "siteName" | "ogImageWidth" | "title">,
  pageUrl: URL
): string | undefined {
  const candidates: { url: string; declaredWidth?: number }[] = [];
  if (page.jsonLdImage) {
    candidates.push({ url: page.jsonLdImage });
  }
  if (page.image) {
    candidates.push({ url: page.image, declaredWidth: page.ogImageWidth });
  }
  for (const c of candidates) {
    const abs = absolutize(c.url, pageUrl);
    if (
      abs &&
      !isGenericImageUrl(abs, {
        siteName: page.siteName,
        hostname: pageUrl.hostname,
        title: page.title,
        declaredWidth: c.declaredWidth,
      })
    ) {
      return abs;
    }
  }
  return undefined;
}
