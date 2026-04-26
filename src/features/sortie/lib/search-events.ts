import {
  EVENT_PROVIDERS,
  type EventProviderName,
  type UnifiedEventResult,
} from "./event-providers";
import { searchTicketmasterEventsRich } from "./ticketmaster-search";

export type EventSearchOutcome = {
  results: UnifiedEventResult[];
  /**
   * Sources qui ont jeté une erreur (rare — chaque provider doit déjà
   * avaler ses propres erreurs et retourner []). Utile en debug pour
   * détecter une régression dans un provider sans casser le flux user.
   */
  failedSources: EventProviderName[];
  /**
   * Suggestion d'orthographe Ticketmaster captée pendant la passe.
   * Non-null uniquement si l'appelant a passé `withTmSpellcheck: true`
   * dans `searchEvents` ET que TM a renvoyé une suggestion. Permet à
   * `searchEventsWithSpellcheck` de récupérer la correction sans payer
   * d'appel TM dédié.
   */
  tmSpellcheckSuggestion: string | null;
};

export type EventSearchOutcomeWithSpellcheck = EventSearchOutcome & {
  /**
   * Non-null seulement quand la 1re recherche a ramené 0 résultat
   * tous-sources confondus, que Ticketmaster a proposé une orthographe
   * alternative, et que la 2e recherche sur cette suggestion a ramené
   * au moins un résultat. L'UI affiche "Aucun résultat pour 'rolland'
   * — affichage pour 'roland'".
   */
  correctedQuery: string | null;
};

/**
 * Fenêtre de tolérance pour considérer deux events comme "le même".
 * Heure exacte trop stricte : Ticketmaster annonce souvent 20h,
 * OpenAgenda annonce 19h30 (ouverture des portes vs début spectacle).
 * 12h est large mais évite de fusionner deux sessions distinctes
 * d'un même festival le même jour.
 */
const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Normalise une chaîne pour la dédoublication : minuscules, suppression
 * des accents, ponctuation collapsée, espaces uniques. "Stéréolux —
 * concert" et "stereolux concert" doivent matcher.
 */
function normalize(value: string | null): string {
  if (!value) {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildDedupBucket(event: UnifiedEventResult): string {
  const title = normalize(event.title);
  const city = normalize(event.city);
  // Bucket temporel à la demi-journée (00h ou 12h). Couplé à la fenêtre
  // de 12h plus bas, ça empêche de manquer un match juste parce que
  // les deux events tombent à cheval sur la frontière du bucket.
  let dayBucket = "no-date";
  if (event.startsAt) {
    const ts = Date.parse(event.startsAt);
    if (Number.isFinite(ts)) {
      dayBucket = String(Math.floor(ts / DEDUP_WINDOW_MS));
    }
  }
  return `${title}|${city}|${dayBucket}`;
}

/**
 * Vérifie si deux events sont assez proches pour être fusionnés. Le
 * bucket attrape les voisins évidents ; ce check rattrape les cas où
 * les buckets sont adjacents (event à 23h59 vs 00h01 le lendemain).
 */
function looksLikeSameEvent(a: UnifiedEventResult, b: UnifiedEventResult): boolean {
  if (normalize(a.title) !== normalize(b.title)) {
    return false;
  }
  if (normalize(a.city) !== normalize(b.city)) {
    return false;
  }
  if (!a.startsAt || !b.startsAt) {
    return a.startsAt === b.startsAt;
  }
  const ta = Date.parse(a.startsAt);
  const tb = Date.parse(b.startsAt);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) {
    return false;
  }
  return Math.abs(ta - tb) <= DEDUP_WINDOW_MS;
}

function compareForDisplay(a: UnifiedEventResult, b: UnifiedEventResult): number {
  // Events datés avant les sans-date ; à date égale, ordre alphabétique
  // sur le titre normalisé pour rester stable d'un appel à l'autre.
  if (a.startsAt && b.startsAt) {
    const cmp = a.startsAt.localeCompare(b.startsAt);
    if (cmp !== 0) {
      return cmp;
    }
  } else if (a.startsAt) {
    return -1;
  } else if (b.startsAt) {
    return 1;
  }
  return normalize(a.title).localeCompare(normalize(b.title));
}

/**
 * Lance toutes les sources en parallèle, dédoublonne les résultats,
 * trie chronologiquement.
 *
 * `limitPerSource` = combien chaque source peut retourner *avant*
 * dédoublonnage. Le total final peut donc dépasser ce nombre si les
 * sources retournent des events distincts ; la route API plus haut
 * tronque au besoin.
 *
 * Best-effort sur tout : une source qui throw n'empêche pas les
 * autres de remonter. La liste `failedSources` sert au debug, pas au UX.
 */
export type SearchEventsOpts = {
  /**
   * Active `includeSpellcheck=yes` sur le 1er appel TM du parcours.
   * La suggestion remonte via `tmSpellcheckSuggestion` dans le retour.
   * Utilisé par `searchEventsWithSpellcheck` pour économiser un appel
   * TM dédié — au lieu d'avoir 4 appels TM dans le worst case typo,
   * on en a 2.
   */
  withTmSpellcheck?: boolean;
};

export async function searchEvents(
  query: string,
  limitPerSource: number,
  opts: SearchEventsOpts = {}
): Promise<EventSearchOutcome> {
  // Quand `withTmSpellcheck` est demandé, on bypasse le provider TM
  // standard (qui n'expose pas la suggestion) et on appelle directement
  // le helper "rich". L'ordre des résultats reste identique grâce à un
  // index de remap qui maintient TM en tête pour le tiebreaker dedup.
  let tmSpellcheckSuggestion: string | null = null;
  const promises: Promise<UnifiedEventResult[]>[] = EVENT_PROVIDERS.map((provider) => {
    if (opts.withTmSpellcheck && provider.name === "ticketmaster") {
      return searchTicketmasterEventsRich(query, limitPerSource, "wizard-search").then((rich) => {
        tmSpellcheckSuggestion = rich.spellcheckSuggestion;
        return rich.results.map((r) => ({ source: "ticketmaster" as const, ...r }));
      });
    }
    return provider.search(query, limitPerSource);
  });

  const settled = await Promise.allSettled(promises);

  const failedSources: EventProviderName[] = [];
  // Map clé→event : la 1re occurrence gagne. L'ordre d'EVENT_PROVIDERS
  // détermine donc la priorité (cf. commentaire dans event-providers.ts).
  const buckets = new Map<string, UnifiedEventResult>();

  settled.forEach((outcome, index) => {
    const provider = EVENT_PROVIDERS[index];
    if (outcome.status === "rejected") {
      failedSources.push(provider.name);
      const reason =
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      console.warn(`[search-events] ${provider.name} threw:`, reason);
      return;
    }
    for (const event of outcome.value) {
      const key = buildDedupBucket(event);
      const existing = buckets.get(key);
      if (existing && looksLikeSameEvent(existing, event)) {
        continue;
      }
      if (existing) {
        // Collision de bucket sans match réel — rare, mais on stocke
        // sous une clé désambiguïsée pour ne pas perdre le 2e event.
        buckets.set(`${key}#${event.source}:${event.id}`, event);
      } else {
        buckets.set(key, event);
      }
    }
  });

  const results = Array.from(buckets.values()).sort(compareForDisplay);
  return { results, failedSources, tmSpellcheckSuggestion };
}

/**
 * Variante avec retry orthographique. Si la 1re passe agrégée ne ramène
 * AUCUN résultat (toutes sources comprises), on récupère la suggestion
 * d'orthographe TM (déjà captée pendant le 1er appel grâce à
 * `withTmSpellcheck`) et on relance la recherche multi-sources sur la
 * query corrigée. Évite de basculer sur le fallback Gemini (lent +
 * payant) pour des fautes triviales du type "rolland" → "roland".
 *
 * Économie : 2 appels TM dans le worst case (avant : 4) — la suggestion
 * remonte en sideband au 1er appel, plus besoin d'un cycle TM dédié.
 *
 * Spellcheck = TM-only car c'est la seule source qui en propose ; mais
 * le 2e appel bénéficie à toutes les sources, donc OpenAgenda voit
 * aussi la query corrigée.
 */
export async function searchEventsWithSpellcheck(
  query: string,
  limitPerSource: number
): Promise<EventSearchOutcomeWithSpellcheck> {
  const first = await searchEvents(query, limitPerSource, { withTmSpellcheck: true });
  if (first.results.length > 0) {
    return { ...first, correctedQuery: null };
  }

  const suggestion = first.tmSpellcheckSuggestion?.trim();
  if (!suggestion || suggestion.toLowerCase() === query.trim().toLowerCase()) {
    return { ...first, correctedQuery: null };
  }

  const second = await searchEvents(suggestion, limitPerSource);
  if (second.results.length === 0) {
    return { ...first, correctedQuery: null };
  }
  return { ...second, correctedQuery: suggestion };
}
