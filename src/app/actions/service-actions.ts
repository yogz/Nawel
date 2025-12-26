"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { services, items, ingredients } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import { createServiceSchema, serviceSchema, deleteServiceSchema } from "./schemas";
import { createSafeAction } from "@/lib/action-utils";
import { scaleQuantity } from "@/lib/utils";

export const createServiceAction = createSafeAction(createServiceSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);
  const [created] = await db
    .insert(services)
    .values({
      mealId: input.mealId,
      title: input.title,
      peopleCount: input.peopleCount ?? 1,
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

    if (!current) throw new Error("Service non trouvé");

    const oldPeopleCount = current.peopleCount;
    const newPeopleCount = input.peopleCount ?? oldPeopleCount;

    // 2. Update service
    const [updatedService] = await tx
      .update(services)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.peopleCount !== undefined && { peopleCount: input.peopleCount }),
      })
      .where(eq(services.id, input.id))
      .returning();

    // 3. Cascade quantity update to items and ingredients if peopleCount changed
    if (newPeopleCount !== oldPeopleCount && oldPeopleCount > 0) {
      const serviceItems = await tx.query.items.findMany({
        where: eq(items.serviceId, input.id),
        with: {
          ingredients: true,
        },
      });

      for (const item of serviceItems) {
        // Scale Item quantity
        const newItemQuantity = scaleQuantity(item.quantity, oldPeopleCount, newPeopleCount);
        if (newItemQuantity !== item.quantity) {
          await tx.update(items).set({ quantity: newItemQuantity }).where(eq(items.id, item.id));
        }

        // Scale Ingredients quantity
        for (const ing of item.ingredients) {
          const newIngQuantity = scaleQuantity(ing.quantity, oldPeopleCount, newPeopleCount);
          if (newIngQuantity !== ing.quantity) {
            await tx
              .update(ingredients)
              .set({ quantity: newIngQuantity })
              .where(eq(ingredients.id, ing.id));
          }
        }
      }
    }

    return updatedService;
  });

  await logChange("update", "services", updated.id, null, updated);
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
