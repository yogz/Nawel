import { useMemo } from "react";
import type { Person } from "@/lib/types";

/**
 * Hook to retrieve a valid guest token for the current event from localStorage.
 * It checks if any person in the provided list has a corresponding token stored locally.
 */
export function useGuestToken(people: Person[], slug?: string) {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      // 1. Check for event-specific token (new method)
      if (slug) {
        const eventToken = localStorage.getItem(`event_token_${slug}`);
        if (eventToken) return eventToken;
      }

      // 2. Check for legacy global tokens map
      const tokensStr = localStorage.getItem("colist_guest_tokens");
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        // Find the first person in this event for whom we have a token
        const personWithToken = people.find((p) => tokens[p.id]);
        return personWithToken ? (tokens[personWithToken.id] as string) : null;
      }

      return null;
    } catch (e) {
      console.error("Failed to parse guest tokens from localStorage:", e);
      return null;
    }
  }, [people, slug]);
}
