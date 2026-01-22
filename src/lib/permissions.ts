/**
 * Permissions System
 *
 * Centralized permission logic for the application.
 *
 * Permission Matrix:
 *
 * | Authenticated | Owner | Admin Key | Person Token | Access Level |
 * |---------------|-------|-----------|--------------|--------------|
 * | ✅            | ✅    | ❌        | ❌           | Full         |
 * | ✅            | ❌    | ✅        | ❌           | Full         |
 * | ❌            | -     | ✅        | ✅           | Own Person   |
 * | ❌            | -     | ✅        | ❌           | None         |
 * | ✅/❌         | -     | ❌        | -            | None         |
 *
 * Rules:
 * - Owner bypasses admin key (full access)
 * - Admin key + authenticated user = full access
 * - Admin key + person token = can modify only that person
 * - No admin key = no access (except for owner)
 */

import { auth } from "./auth-config";
import { headers } from "next/headers";
import { db } from "./db";
import { people } from "@drizzle/schema";
import { eq, and } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export type Event = {
  id: number;
  adminKey: string | null;
  ownerId: string | null;
};

export type Person = {
  id: number;
  eventId: number;
  token: string | null;
  userId: string | null;
};

export type PermissionLevel = "none" | "own-person" | "full";

// ============================================================================
// PERMISSION CHECKS - EVENT LEVEL
// ============================================================================

/**
 * Checks if the user has WRITE access to an event
 *
 * Logic:
 * - Owner → full access (bypasses admin key)
 * - Valid admin key → full access
 * - Otherwise → no access
 */
export async function hasEventWriteAccess(
  key: string | undefined | null,
  event: Event
): Promise<boolean> {
  // 1. Check if user is the owner
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session && event.ownerId && session.user.id === event.ownerId) {
    return true; // ✅ Owner bypasses admin key
  }

  // 2. Check admin key
  if (key && event.adminKey && key === event.adminKey) {
    return true; // ✅ Valid admin key
  }

  return false; // ❌ No access
}

/**
 * Version that throws an error if no access
 */
export async function assertEventWriteAccess(
  key: string | undefined | null,
  event: Event
): Promise<void> {
  if (!(await hasEventWriteAccess(key, event))) {
    throw new Error("Unauthorized");
  }
}

// ============================================================================
// PERMISSION CHECKS - PERSON LEVEL
// ============================================================================

/**
 * Checks if the user can modify a specific person
 *
 * Logic:
 * - Event owner → can modify everything
 * - Admin key + person token → can modify THAT person only
 * - Admin key + authenticated user → can modify everything
 * - Otherwise → no access
 *
 * @returns PermissionLevel - "full" | "own-person" | "none"
 */
export async function getPersonPermissionLevel(
  key: string | undefined | null,
  personToken: string | undefined | null,
  personId: number,
  event: Event
): Promise<PermissionLevel> {
  // 1. Check if user is the event owner
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session && event.ownerId && session.user.id === event.ownerId) {
    return "full"; // ✅ Owner → full access
  }

  // 2. Check admin key
  if (!key || !event.adminKey || key !== event.adminKey) {
    return "none"; // ❌ No valid admin key
  }

  // 3. Valid admin key → check if user is authenticated
  if (session) {
    return "full"; // ✅ Authenticated + admin key → full access
  }

  // 4. Valid admin key + not authenticated → check person token
  if (personToken) {
    const person = await db.query.people.findFirst({
      where: and(eq(people.id, personId), eq(people.eventId, event.id)),
    });

    if (person && person.token === personToken) {
      return "own-person"; // ✅ Valid token → can modify OWN person
    }
  }

  return "none"; // ❌ No access
}

/**
 * Checks if user can modify a person (throws error otherwise)
 */
export async function assertCanModifyPerson(
  key: string | undefined | null,
  personToken: string | undefined | null,
  personId: number,
  event: Event
): Promise<void> {
  const level = await getPersonPermissionLevel(key, personToken, personId, event);

  if (level === "none") {
    throw new Error("Unauthorized: You cannot modify this person");
  }
}

/**
 * Checks if user has FULL event access (not just their own person)
 */
export async function hasFullEventAccess(
  key: string | undefined | null,
  event: Event
): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Owner OR (Admin key + Authenticated)
  if (session && event.ownerId && session.user.id === event.ownerId) {
    return true;
  }

  if (session && key && event.adminKey && key === event.adminKey) {
    return true;
  }

  return false;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Simply checks if a key matches an event's admin key
 */
export function isAdminKeyValid(key: string | undefined | null, eventKey: string | null): boolean {
  if (!eventKey) {
    return false;
  }
  return key === eventKey;
}
