"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { meals, services } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import {
  createMealSchema,
  updateMealSchema,
  createMealWithServicesSchema,
  deleteMealSchema,
} from "./schemas";
import { createSafeAction } from "@/lib/action-utils";
import { scaleQuantity } from "@/lib/utils";
import { items, ingredients } from "@drizzle/schema";

export const createMealAction = createSafeAction(createMealSchema, async (input) => {
  const event = await verifyEventAccess(input.slug, input.key);
  const [created] = await db
    .insert(meals)
    .values({
      eventId: event.id,
      date: input.date,
      title: input.title ?? null,
      adults: input.adults ?? event.adults,
      children: input.children ?? event.children,
    })
    .returning();
  await logChange("create", "meals", created.id, null, created);
  revalidatePath(`/event/${input.slug}`);
  return created;
});

export const createMealWithServicesAction = createSafeAction(
  createMealWithServicesSchema,
  async (input) => {
    const event = await verifyEventAccess(input.slug, input.key);

    const result = await db.transaction(async (tx) => {
      const [meal] = await tx
        .insert(meals)
        .values({
          eventId: event.id,
          date: input.date,
          title: input.title ?? null,
          adults: input.adults ?? event.adults,
          children: input.children ?? event.children,
        })
        .returning();

      const totalGuests = (input.adults ?? event.adults) + (input.children ?? event.children);
      const createdServices = [];
      for (let i = 0; i < input.services.length; i++) {
        const [service] = await tx
          .insert(services)
          .values({
            mealId: meal.id,
            title: input.services[i],
            order: i,
            peopleCount: totalGuests || 1,
          })
          .returning();
        createdServices.push({ ...service, items: [] });
      }

      return { meal, createdServices };
    });

    // Log changes OUTSIDE the transaction to avoid deadlock
    await logChange("create", "meals", result.meal.id, null, result.meal);
    for (const service of result.createdServices) {
      await logChange("create", "services", service.id, null, service);
    }

    revalidatePath(`/event/${input.slug}`);
    return { ...result.meal, services: result.createdServices };
  }
);

export const updateMealAction = createSafeAction(updateMealSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);

  const updated = await db.transaction(async (tx) => {
    // 1. Fetch old meal to see if guests changed
    const current = await tx.query.meals.findFirst({
      where: eq(meals.id, input.id),
    });
    if (!current) throw new Error("Repas non trouvé");

    const oldAdults = current.adults;
    const oldChildren = current.children;
    const newAdults = input.adults ?? oldAdults;
    const newChildren = input.children ?? oldChildren;

    const guestsChanged = newAdults !== oldAdults || newChildren !== oldChildren;

    // 2. Update meal
    const [updatedMeal] = await tx
      .update(meals)
      .set({
        date: input.date,
        title: input.title,
        adults: input.adults,
        children: input.children,
      })
      .where(eq(meals.id, input.id))
      .returning();

    // 3. Cascade to services if guests changed
    if (guestsChanged) {
      const newTotal = newAdults + newChildren;
      const oldTotal = oldAdults + oldChildren;

      const mealServices = await tx.query.services.findMany({
        where: eq(services.mealId, updatedMeal.id),
      });

      for (const service of mealServices) {
        const serviceOldPeople = service.peopleCount;

        // Update service peopleCount
        await tx.update(services).set({ peopleCount: newTotal }).where(eq(services.id, service.id));

        // Scale items in this service
        if (serviceOldPeople > 0 && newTotal !== serviceOldPeople) {
          const serviceItems = await tx.query.items.findMany({
            where: eq(items.serviceId, service.id),
            with: { ingredients: true },
          });

          for (const item of serviceItems) {
            const newItemQuantity = scaleQuantity(item.quantity, serviceOldPeople, newTotal);
            if (newItemQuantity !== item.quantity) {
              await tx
                .update(items)
                .set({ quantity: newItemQuantity })
                .where(eq(items.id, item.id));
            }

            for (const ing of item.ingredients) {
              const newIngQuantity = scaleQuantity(ing.quantity, serviceOldPeople, newTotal);
              if (newIngQuantity !== ing.quantity) {
                await tx
                  .update(ingredients)
                  .set({ quantity: newIngQuantity })
                  .where(eq(ingredients.id, ing.id));
              }
            }
          }
        }
      }
    }

    return updatedMeal;
  });

  await logChange("update", "meals", updated.id, null, updated);
  revalidatePath(`/event/${input.slug}`);
  return updated;
});

export const deleteMealAction = createSafeAction(deleteMealSchema, async (input) => {
  await verifyEventAccess(input.slug, input.key);
  const [deleted] = await db.delete(meals).where(eq(meals.id, input.id)).returning();
  if (deleted) {
    await logChange("delete", "meals", deleted.id, deleted, null);
  }
  revalidatePath(`/event/${input.slug}`);
  return { success: true };
});
