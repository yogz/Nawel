"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { sanitizeStrictText } from "@/lib/sanitize";
import { people, items, user, events } from "@drizzle/schema";
import { eq, and } from "drizzle-orm";
import { verifyAccess } from "./shared";
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
import { assertCanModifyPersonLegacy } from "@/lib/permissions";

export const joinEventAction = createSafeAction(baseInput, async (input) => {
  const { event } = await verifyAccess(input.slug, "person:create", input.key);

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
  const { event } = await verifyAccess(input.slug, "person:create", input.key);

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
  const { event } = await verifyAccess(input.slug, "person:update:self", input.key, input.token);

  // Verify person-specific permissions (owner, admin key + auth, or admin key + token)
  await assertCanModifyPersonLegacy(input.key, input.token, input.id, event);

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
  const { event } = await verifyAccess(input.slug, "person:delete", input.key);

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
  const { event } = await verifyAccess(input.slug, "person:update:self", input.key);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized: Please log in to claim a profile");
  }

  const oldPerson = await db.query.people.findFirst({
    where: and(eq(people.id, input.personId), eq(people.eventId, event.id)),
  });

  if (!oldPerson) {
    throw new Error("Person not found in this event");
  }

  if (oldPerson.userId) {
    throw new Error("This profile is already claimed by another user");
  }

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
  const { event } = await verifyAccess(input.slug, "person:update:self", input.key);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const oldPerson = await db.query.people.findFirst({
    where: and(eq(people.id, input.personId), eq(people.eventId, event.id)),
  });

  if (!oldPerson) {
    throw new Error("Person not found in this event");
  }

  const isProfileOwner = session.user.id === oldPerson.userId;
  const isEventOwner = session.user.id === event.ownerId;

  if (!isProfileOwner && !isEventOwner) {
    throw new Error("Unauthorized: You do not own this profile");
  }

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
    const { event } = await verifyAccess(input.slug, "person:update:self", input.key, input.token);

    // Verify person-specific permissions (owner, admin key + auth, or admin key + token)
    await assertCanModifyPersonLegacy(input.key, input.token, input.personId, event);

    const person = await db.query.people.findFirst({
      where: eq(people.id, input.personId),
    });

    if (!person) {
      throw new Error("Person not found");
    }

    const [updated] = await db
      .update(people)
      .set({
        status: input.status,
        guest_adults: input.guestAdults ?? person.guest_adults,
        guest_children: input.guestChildren ?? person.guest_children,
      })
      .where(eq(people.id, input.personId))
      .returning();

    await logChange("update", "people", updated.id, person, updated);
    revalidatePath(`/event/${input.slug}`);
    return updated;
  }
);
