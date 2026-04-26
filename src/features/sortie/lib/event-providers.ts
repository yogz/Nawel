import { searchTicketmasterEvents, type TicketmasterResult } from "./ticketmaster-search";
import { searchOpenAgendaEvents, type OpenAgendaResult } from "./openagenda-search";

/**
 * Identifiant stable de chaque source. Sert :
 *   - de clé de tri / dédoublonnage prioritaire (cf. orchestrateur)
 *   - de badge UI ("via Ticketmaster", "via OpenAgenda"…)
 *   - de namespace de logs et de cache
 *
 * Ajouter une source = ajouter une valeur ici + une entrée dans
 * EVENT_PROVIDERS plus bas. Le reste du pipeline est agnostique.
 */
export type EventProviderName = "ticketmaster" | "openagenda";

/**
 * Résultat unifié exposé aux callers (route API, orchestrateur).
 * Shape volontairement plate et identique pour toutes les sources —
 * on ne propage pas les particularités d'une API tierce au-delà de
 * son module dédié, sinon le UI doit changer chaque fois qu'on ajoute
 * une source.
 */
export type UnifiedEventResult = {
  source: EventProviderName;
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  image: string | null;
  startsAt: string | null;
  ticketUrl: string;
};

type ProviderSearch = (query: string, limit: number) => Promise<UnifiedEventResult[]>;

type ProviderConfig = {
  name: EventProviderName;
  search: ProviderSearch;
};

/**
 * Adaptateur générique : prend un résultat natif d'une source et le
 * tague avec son `source`. Évite de faire fuiter les types natifs
 * (TicketmasterResult, OpenAgendaResult, …) hors du registre.
 */
function tag<T extends Omit<UnifiedEventResult, "source">>(
  source: EventProviderName,
  results: T[]
): UnifiedEventResult[] {
  return results.map((r) => ({ source, ...r }));
}

/**
 * Registre des sources interrogées par l'orchestrateur.
 *
 * L'ordre du tableau est utilisé comme tiebreaker stable lors du
 * dédoublonnage : si deux sources retournent le même événement
 * (même titre+ville+date), c'est celle listée en premier qui gagne.
 * On garde Ticketmaster en tête car ses metadata (image hero,
 * deeplink billetterie) sont les mieux normalisées.
 */
export const EVENT_PROVIDERS: ProviderConfig[] = [
  {
    name: "ticketmaster",
    search: async (query, limit) => {
      const results: TicketmasterResult[] = await searchTicketmasterEvents(query, limit);
      return tag("ticketmaster", results);
    },
  },
  {
    name: "openagenda",
    search: async (query, limit) => {
      const results: OpenAgendaResult[] = await searchOpenAgendaEvents(query, limit);
      return tag("openagenda", results);
    },
  },
];
