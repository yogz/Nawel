"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { sanitizeStrictText } from "@/lib/sanitize";
import { people, items } from "@drizzle/schema";
import { eq, and } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import {
  createPersonSchema,
  updatePersonSchema,
  deletePersonSchema,
  claimPersonSchema,
  unclaimPersonSchema,
  baseInput,
} from "./schemas";
import { createSafeAction } from "@/lib/action-utils";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";

export const joinEventAction = createSafeAction(baseInput, async (input) => {
  const event = await verifyEventAccess(input.slug, input.key);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check if already a participant
  const existing = await db.query.people.findFirst({
    where: and(eq(people.eventId, event.id), eq(people.userId, session.user.id)),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(people)
    .values({
      eventId: event.id,
      name: sanitizeStrictText(session.user.name ?? "Utilisateur", 50),
      userId: session.user.id,
    })
    .returning();

  await logChange("create", "people", created.id, null, created);
  revalidatePath(`/event/${input.slug}`);
  revalidatePath("/");
  return created;
});

export const createPersonAction = createSafeAction(createPersonSchema, async (input) => {
  const event = await verifyEventAccess(input.slug, input.key);
  const [created] = await db
    .insert(people)
    .values({
      eventId: event.id,
      name: input.name,
      emoji: input.emoji ?? null,
      userId: input.userId ?? null,
    })
    .returning();
  await logChange("create", "people", created.id, null, created);
  revalidatePath(`/event/${input.slug}`);
  revalidatePath("/");
  return created;
});

export const updatePersonAction = createSafeAction(updatePersonSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);

  const oldPerson = await db.query.people.findFirst({
    where: eq(people.id, input.id),
  });

  const [updated] = await db
    .update(people)
    .set({ name: input.name, emoji: input.emoji })
    .where(eq(people.id, input.id))
    .returning();

  // If this person is linked to a user, synchronize with the user's global profile
  if (updated.userId) {
    const currentHeaders = await headers();
    const session = await auth.api.getSession({
      headers: currentHeaders,
    });

    if (session?.user && session.user.id === updated.userId) {
      // Use auth helper to update user profile
      await auth.api.updateUser({
        headers: currentHeaders,
        body: {
          name: updated.name,
          emoji: updated.emoji ?? undefined,
        },
      });
    }
  }

  await logChange("update", "people", updated.id, oldPerson, updated);
  revalidatePath(`/event/${input.slug}`);
  revalidatePath("/");
  return updated;
});

export const deletePersonAction = createSafeAction(deletePersonSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);

  // Unassign items first
  await db.update(items).set({ personId: null }).where(eq(items.personId, input.id));

  const [deleted] = await db.delete(people).where(eq(people.id, input.id)).returning();
  if (deleted) {
    await logChange("delete", "people", deleted.id, deleted, null);
  }
  revalidatePath(`/event/${input.slug}`);
  revalidatePath("/");
  return { success: true };
});
export const claimPersonAction = createSafeAction(claimPersonSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized: Please log in to claim a profile");
  }

  const oldPerson = await db.query.people.findFirst({
    where: eq(people.id, input.personId),
  });

  const [updated] = await db
    .update(people)
    .set({ userId: session.user.id })
    .where(eq(people.id, input.personId))
    .returning();

  await logChange("update", "people", updated.id, oldPerson, updated);
  revalidatePath(`/event/${input.slug}`);
  revalidatePath("/");
  return updated;
});

export const unclaimPersonAction = createSafeAction(unclaimPersonSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const oldPerson = await db.query.people.findFirst({
    where: eq(people.id, input.personId),
  });

  const [updated] = await db
    .update(people)
    .set({ userId: null })
    .where(eq(people.id, input.personId))
    .returning();

  await logChange("update", "people", updated.id, oldPerson, updated);
  revalidatePath(`/event/${input.slug}`);
  revalidatePath("/");
  return updated;
});
