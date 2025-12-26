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

export const createMealAction = createSafeAction(createMealSchema, async (input) => {
  const event = await verifyEventAccess(input.slug, input.key);
  const [created] = await db
    .insert(meals)
    .values({ eventId: event.id, date: input.date, title: input.title ?? null })
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
        .values({ eventId: event.id, date: input.date, title: input.title ?? null })
        .returning();

      const createdServices = [];
      for (let i = 0; i < input.services.length; i++) {
        const [service] = await tx
          .insert(services)
          .values({ mealId: meal.id, title: input.services[i], order: i })
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
  const [updated] = await db
    .update(meals)
    .set({ date: input.date, title: input.title })
    .where(eq(meals.id, input.id))
    .returning();
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
