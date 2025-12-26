"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { people, items } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import {
  createPersonSchema,
  updatePersonSchema,
  deletePersonSchema,
  claimPersonSchema,
  unclaimPersonSchema,
} from "./schemas";
import { createSafeAction } from "@/lib/action-utils";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";

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
  return created;
});

export const updatePersonAction = createSafeAction(updatePersonSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);
  const [updated] = await db
    .update(people)
    .set({ name: input.name, emoji: input.emoji })
    .where(eq(people.id, input.id))
    .returning();
  await logChange("update", "people", updated.id, null, updated);
  revalidatePath(`/event/${input.slug}`);
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

  const [updated] = await db
    .update(people)
    .set({ userId: session.user.id })
    .where(eq(people.id, input.personId))
    .returning();

  await logChange("update", "people", updated.id, null, updated);
  revalidatePath(`/event/${input.slug}`);
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

  const [updated] = await db
    .update(people)
    .set({ userId: null })
    .where(eq(people.id, input.personId))
    .returning();

  await logChange("update", "people", updated.id, null, updated);
  revalidatePath(`/event/${input.slug}`);
  return updated;
});
