import { useMemo } from "react";
import type { Person } from "@/lib/types";

/**
 * Hook to retrieve a valid guest token for the current event from localStorage.
 * It checks if any person in the provided list has a corresponding token stored locally.
 */
export function useGuestToken(people: Person[]) {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const tokensStr = localStorage.getItem("colist_guest_tokens");
      if (!tokensStr) return null;

      const tokens = JSON.parse(tokensStr);
      // Find the first person in this event for whom we have a token
      const personWithToken = people.find((p) => tokens[p.id]);
      return personWithToken ? (tokens[personWithToken.id] as string) : null;
    } catch (e) {
      console.error("Failed to parse guest tokens from localStorage:", e);
      return null;
    }
  }, [people]);
}
