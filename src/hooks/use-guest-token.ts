import { useMemo } from "react";
import type { Person } from "@/lib/types";
import { getGuestToken, getLegacyPersonTokens } from "@/lib/guest-token";

/**
 * Hook to retrieve a valid guest token for the current event from localStorage.
 * Expired entries are purged lazily.
 */
export function useGuestToken(people: Person[], slug?: string) {
  return useMemo(() => {
    if (typeof window === "undefined") return null;

    if (slug) {
      const eventToken = getGuestToken(slug);
      if (eventToken) return eventToken;
    }

    const tokens = getLegacyPersonTokens();
    const personWithToken = people.find((p) => tokens[String(p.id)]);
    return personWithToken ? tokens[String(personWithToken.id)] : null;
  }, [people, slug]);
}
