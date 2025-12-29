"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { services, meals } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import { createServiceSchema, serviceSchema, deleteServiceSchema } from "./schemas";
import { createSafeAction } from "@/lib/action-utils";

export const createServiceAction = createSafeAction(createServiceSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);

  // Fetch parent meal for initialization if counts not provided
  let adults = input.adults;
  let children = input.children;

  if (adults === undefined || children === undefined) {
    const meal = await db.query.meals.findFirst({
      where: eq(meals.id, input.mealId),
    });
    if (meal) {
      adults = adults ?? meal.adults;
      children = children ?? meal.children;
    }
  }

  const finalAdults = adults ?? 0;
  const finalChildren = children ?? 0;
  const finalPeopleCount = input.peopleCount ?? finalAdults + finalChildren;

  const [created] = await db
    .insert(services)
    .values({
      mealId: input.mealId,
      title: input.title,
      adults: finalAdults,
      children: finalChildren,
      peopleCount: finalPeopleCount,
    })
    .returning();

  await logChange("create", "services", created.id, null, created);
  revalidatePath(`/event/${input.slug}`);
  return created;
});

export const updateServiceAction = createSafeAction(serviceSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);

  const updated = await db.transaction(async (tx) => {
    // 1. Fetch current service to get old peopleCount
    const current = await tx.query.services.findFirst({
      where: eq(services.id, input.id),
    });

    if (!current) {
      throw new Error("Service non trouvé");
    }

    // Reserved for future cascade logic
    const _oldPeopleCount = current.peopleCount;

    const newAdults = input.adults !== undefined ? input.adults : current.adults;
    const newChildren = input.children !== undefined ? input.children : current.children;
    const newPeopleCount =
      input.peopleCount !== undefined ? input.peopleCount : newAdults + newChildren;

    // 2. Update service
    const [updatedService] = await tx
      .update(services)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        adults: newAdults,
        children: newChildren,
        peopleCount: newPeopleCount,
      })
      .where(eq(services.id, input.id))
      .returning();

    return updatedService;
  });

  // Fetch old data for audit (the transaction logic could be optimized but this is safe)
  const oldService = await db.query.services.findFirst({
    where: eq(services.id, input.id),
  });

  await logChange("update", "services", updated.id, oldService, updated);
  revalidatePath(`/event/${input.slug}`);
  return updated;
});

export const deleteServiceAction = createSafeAction(deleteServiceSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);
  const [deleted] = await db.delete(services).where(eq(services.id, input.id)).returning();
  if (deleted) {
    await logChange("delete", "services", deleted.id, deleted, null);
  }
  revalidatePath(`/event/${input.slug}`);
  return { success: true };
});
