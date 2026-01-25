"use client";

import { useMemo } from "react";
import type { Person } from "@/lib/types";

/**
 * Hook to get the current person for the event.
 * Works for both authenticated users (via userId) and guests (via localStorage token).
 *
 * @param people - List of people in the event
 * @param userId - Current authenticated user's ID (from session)
 * @returns The current person, or null if not identified
 */
export function useCurrentPerson(people: Person[], userId?: string | null): Person | null {
  return useMemo(() => {
    // 1. Try authenticated user first
    if (userId) {
      const person = people.find((p) => p.userId === userId);
      if (person) return person;
    }

    // 2. Fall back to guest token
    if (typeof window === "undefined") return null;

    try {
      const tokensStr = localStorage.getItem("colist_guest_tokens");
      if (!tokensStr) return null;

      const tokens = JSON.parse(tokensStr) as Record<number, string>;
      // Find the first person in this event for whom we have a token
      const personWithToken = people.find((p) => tokens[p.id]);
      return personWithToken || null;
    } catch (e) {
      console.error("Failed to parse guest tokens from localStorage:", e);
      return null;
    }
  }, [people, userId]);
}
