"use server";

import { type z } from "zod";
import { db } from "@/lib/db";
import {
  assertEventWriteAccess,
  hasEventWriteAccess,
  buildPermissionContext,
  assertCan,
  can,
  type ActionType,
  type PermissionContext,
} from "@/lib/permissions";
import { events, people, meals } from "@drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { type validateSchema } from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";

// ============================================================================
// NEW: Centralized Access Verification
// ============================================================================

/**
 * Verify access for a specific action with full permission context
 *
 * @param slug - Event slug
 * @param action - The action to verify
 * @param key - Admin key (from URL)
 * @param personToken - Person token (from localStorage)
 * @returns event and permission context
 */
export async function verifyAccess(
  slug: string,
  action: ActionType,
  key?: string | null,
  personToken?: string | null
): Promise<{
  event: NonNullable<Awaited<ReturnType<typeof db.query.events.findFirst>>>;
  ctx: PermissionContext;
}> {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) {
    throw new Error("Event not found");
  }

  const ctx = await buildPermissionContext(event, key, personToken);
  assertCan(action, ctx);

  return { event, ctx };
}

/**
 * Check if user has access without throwing
 */
export async function hasAccess(
  slug: string,
  action: ActionType,
  key?: string | null,
  personToken?: string | null
): Promise<boolean> {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) {
    return false;
  }

  const ctx = await buildPermissionContext(event, key, personToken);
  return can(action, ctx);
}

// ============================================================================
// LEGACY: Backward Compatibility
// ============================================================================

/**
 * @deprecated Use verifyAccess(slug, action, key, token) instead
 */
export async function verifyEventAccess(slug: string, key?: string | null) {
  const event = await db.query.events.findFirst({ where: eq(events.slug, slug) });
  if (!event) {
    throw new Error("Event not found");
  }
  await assertEventWriteAccess(key, event);
  return event;
}

export const validateWriteKeyAction = withErrorThrower(
  async (input: z.infer<typeof validateSchema>) => {
    if (!input.slug) {
      return false;
    }
    const event = await db.query.events.findFirst({ where: eq(events.slug, input.slug) });
    if (!event) {
      return false;
    }
    return hasEventWriteAccess(input.key, event, input.token);
  }
);
