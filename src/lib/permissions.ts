/**
 * Centralized Permissions System
 *
 * Single source of truth for all permission rules.
 *
 * Permission Matrix:
 *
 * | Action                    | Key + Auth | Key + Token | Owner | No Key |
 * |---------------------------|:----------:|:-----------:|:-----:|:------:|
 * | Read event                | ✅          | ✅           | ✅     | ✅      |
 * | Create/Update/Delete items| ✅          | ✅           | ✅     | ❌      |
 * | Create/Update/Delete meals| ✅          | ✅           | ✅     | ❌      |
 * | Update/Delete event       | ❌          | ❌           | ✅     | ❌      |
 * | Update own person         | ✅          | ✅           | ✅     | ❌      |
 * | Update other person       | ❌          | ❌           | ✅     | ❌      |
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

/**
 * All possible actions in the application
 */
export type ActionType =
  // Event
  | "event:read"
  | "event:update"
  | "event:delete"
  // Meals
  | "meal:create"
  | "meal:update"
  | "meal:delete"
  // Services
  | "service:create"
  | "service:update"
  | "service:delete"
  // Items
  | "item:create"
  | "item:update"
  | "item:delete"
  | "item:assign"
  | "item:check"
  // Ingredients
  | "ingredient:create"
  | "ingredient:update"
  | "ingredient:delete"
  | "ingredient:generate"
  // Persons
  | "person:create"
  | "person:update:self"
  | "person:update:other"
  | "person:delete";

/**
 * Permission context - built once per request
 */
export type PermissionContext = {
  isAuthenticated: boolean;
  isOwner: boolean;
  hasValidKey: boolean;
  hasValidToken: boolean;
  userId?: string;
  tokenPersonId?: number; // The person ID that the token belongs to
};

// ============================================================================
// PERMISSION RULES
// ============================================================================

/**
 * Central permission rules matrix
 * Modify this to change permissions across the app
 */
const PERMISSION_RULES: Record<ActionType, (ctx: PermissionContext) => boolean> = {
  // Read: always allowed
  "event:read": () => true,

  // Event management: owner only
  "event:update": () => false, // Only owner (handled by isOwner check before)
  "event:delete": () => false, // Only owner

  // Content (meals, services, items): key + (auth OR token)
  "meal:create": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "meal:update": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "meal:delete": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),

  "service:create": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "service:update": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "service:delete": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),

  "item:create": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "item:update": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "item:delete": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "item:assign": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "item:check": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),

  "ingredient:create": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "ingredient:update": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "ingredient:delete": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "ingredient:generate": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),

  // Persons
  "person:create": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "person:update:self": (c) => c.hasValidKey && (c.isAuthenticated || c.hasValidToken),
  "person:update:other": () => false, // Only owner
  "person:delete": () => false, // Only owner
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Central permission check function
 *
 * @param action - The action to check
 * @param ctx - The permission context
 * @returns true if the action is allowed
 */
export function can(action: ActionType, ctx: PermissionContext): boolean {
  // Owner can do everything
  if (ctx.isOwner) {
    return true;
  }

  // Check the permission rule for this action
  const rule = PERMISSION_RULES[action];
  return rule(ctx);
}

/**
 * Throws an error if the action is not allowed
 */
export function assertCan(action: ActionType, ctx: PermissionContext): void {
  if (!can(action, ctx)) {
    throw new Error(`Unauthorized: Cannot perform ${action}`);
  }
}

/**
 * Build a permission context from request data
 */
export async function buildPermissionContext(
  event: Event,
  key?: string | null,
  personToken?: string | null
): Promise<PermissionContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAuthenticated = !!session;
  const isOwner = !!session && !!event.ownerId && session.user.id === event.ownerId;
  const hasValidKey = !!key && !!event.adminKey && key === event.adminKey;

  // Check if token is valid and get the person it belongs to
  let hasValidToken = false;
  let tokenPersonId: number | undefined;

  if (personToken && hasValidKey) {
    const person = await db.query.people.findFirst({
      where: and(eq(people.eventId, event.id), eq(people.token, personToken)),
    });
    if (person) {
      hasValidToken = true;
      tokenPersonId = person.id;
    }
  }

  return {
    isAuthenticated,
    isOwner,
    hasValidKey,
    hasValidToken,
    userId: session?.user.id,
    tokenPersonId,
  };
}

// ============================================================================
// SPECIALIZED CHECKS
// ============================================================================

/**
 * Check if user can modify a specific person
 * Uses the context to determine if it's their own person or someone else's
 */
export function canModifyPerson(
  ctx: PermissionContext,
  targetPersonId: number,
  targetPersonUserId?: string | null
): boolean {
  // Owner can modify anyone
  if (ctx.isOwner) {
    return true;
  }

  // Check if it's their own person (via userId or token)
  const isOwnPersonByUserId = ctx.isAuthenticated && ctx.userId === targetPersonUserId;
  const isOwnPersonByToken = ctx.hasValidToken && ctx.tokenPersonId === targetPersonId;

  if (isOwnPersonByUserId || isOwnPersonByToken) {
    return can("person:update:self", ctx);
  }

  // It's someone else's person
  return can("person:update:other", ctx);
}

/**
 * Throws if user cannot modify the specified person
 */
export function assertCanModifyPerson(
  ctx: PermissionContext,
  targetPersonId: number,
  targetPersonUserId?: string | null
): void {
  if (!canModifyPerson(ctx, targetPersonId, targetPersonUserId)) {
    throw new Error("Unauthorized: You cannot modify this person");
  }
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use buildPermissionContext + canModifyPerson() instead
 * Legacy wrapper for assertCanModifyPerson with the old API
 */
export async function assertCanModifyPersonLegacy(
  key: string | undefined | null,
  personToken: string | undefined | null,
  personId: number,
  event: Event
): Promise<void> {
  const ctx = await buildPermissionContext(event, key, personToken);

  // Get the person to check their userId
  const person = await db.query.people.findFirst({
    where: and(eq(people.id, personId), eq(people.eventId, event.id)),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  if (!canModifyPerson(ctx, personId, person.userId)) {
    throw new Error("Unauthorized: You cannot modify this person");
  }
}

/**
 * @deprecated Use buildPermissionContext + can() instead
 * Checks if the user has WRITE access to an event
 */
export async function hasEventWriteAccess(
  key: string | undefined | null,
  event: Event
): Promise<boolean> {
  const ctx = await buildPermissionContext(event, key);
  return can("item:create", ctx); // General write access
}

/**
 * @deprecated Use buildPermissionContext + assertCan() instead
 */
export async function assertEventWriteAccess(
  key: string | undefined | null,
  event: Event
): Promise<void> {
  if (!(await hasEventWriteAccess(key, event))) {
    throw new Error("Unauthorized");
  }
}

/**
 * Simply checks if a key matches an event's admin key
 */
export function isAdminKeyValid(key: string | undefined | null, eventKey: string | null): boolean {
  if (!eventKey) {
    return false;
  }
  return key === eventKey;
}
