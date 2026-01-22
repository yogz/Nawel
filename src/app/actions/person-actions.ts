"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { sanitizeStrictText } from "@/lib/sanitize";
import { people, items, user } from "@drizzle/schema";
import { eq, and } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import {
  createPersonSchema,
  updatePersonSchema,
  deletePersonSchema,
  claimPersonSchema,
  unclaimPersonSchema,
  updatePersonStatusSchema,
  baseInput,
} from "./schemas";
import { createSafeAction } from "@/lib/action-utils";
import { auth, type User } from "@/lib/auth-config";
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
      emoji: (session.user as User).emoji ?? null,
      image: session.user.image ?? null,
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

  let name = input.name;
  let emoji = input.emoji ?? null;
  let image = input.image ?? null;

  // If linked to a user, initialize from their profile if possible
  if (input.userId) {
    const linkedUser = await db.query.user.findFirst({
      where: eq(user.id, input.userId),
    });
    if (linkedUser) {
      name = sanitizeStrictText(linkedUser.name, 50);
      emoji = (linkedUser as { emoji?: string | null }).emoji ?? null;
      image = linkedUser.image ?? null;
    }
  }

  const [created] = await db
    .insert(people)
    .values({
      eventId: event.id,
      name,
      emoji,
      image,
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
    .set({
      name: input.name,
      emoji: input.emoji,
      image: input.image,
    })
    .where(eq(people.id, input.id))
    .returning();

  // Decoupled: Removed synchronization back to user profile

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
    .set({
      userId: session.user.id,
      // Initialize Guest data from User profile upon claim (Last Choice logic: User data wins here as it's the new source)
      name: sanitizeStrictText(session.user.name ?? oldPerson?.name ?? "Utilisateur", 50),
      emoji: (session.user as User).emoji ?? null,
      image: session.user.image ?? null,
    })
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

export const updatePersonStatusAction = createSafeAction(
  updatePersonStatusSchema,
  async (input) => {
    const event = await verifyEventAccess(input.slug, input.key);

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const person = await db.query.people.findFirst({
      where: eq(people.id, input.personId),
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Permission check: Owner of event OR the user themselves OR valid token
    const isOwner = event.ownerId && session?.user?.id === event.ownerId;
    const isSelf = person.userId && session?.user?.id === person.userId;
    const isTokenValid = input.token && person.token && input.token === person.token;

    if (!isOwner && !isSelf && !isTokenValid) {
      throw new Error("Unauthorized to update this status");
    }

    const [updated] = await db
      .update(people)
      .set({ status: input.status })
      .where(eq(people.id, input.personId))
      .returning();

    await logChange("update", "people", updated.id, person, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
  }
);
