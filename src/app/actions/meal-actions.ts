"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { meals, services } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyAccess } from "./shared";
import {
  createMealSchema,
  updateMealSchema,
  createMealWithServicesSchema,
  deleteMealSchema,
} from "./schemas";
import { createSafeAction } from "@/lib/action-utils";

export const createMealAction = createSafeAction(createMealSchema, async (input) => {
  const { event } = await verifyAccess(input.slug, "meal:create", input.key, input.token);
  const [created] = await db
    .insert(meals)
    .values({
      eventId: event.id,
      date: input.date,
      title: input.title ?? null,
      adults: input.adults ?? event.adults,
      children: input.children ?? event.children,
      time: input.time ?? null,
      address: input.address ?? null,
    })
    .returning();
  revalidatePath(`/event/${input.slug}`);
  return created;
});

export const createMealWithServicesAction = createSafeAction(
  createMealWithServicesSchema,
  async (input) => {
    const { event } = await verifyAccess(input.slug, "meal:create", input.key, input.token);

    const result = await db.transaction(async (tx) => {
      const [meal] = await tx
        .insert(meals)
        .values({
          eventId: event.id,
          date: input.date,
          title: input.title ?? null,
          adults: input.adults ?? event.adults,
          children: input.children ?? event.children,
          time: input.time ?? null,
          address: input.address ?? null,
        })
        .returning();

      const adults = input.adults ?? event.adults;
      const children = input.children ?? event.children;
      const totalGuests = adults + children;

      const createdServices = [];
      for (let i = 0; i < input.services.length; i++) {
        const sInput = input.services[i];
        const sTitle = typeof sInput === "string" ? sInput : sInput.title;
        const sDescription = typeof sInput === "string" ? null : sInput.description;

        const [service] = await tx
          .insert(services)
          .values({
            mealId: meal.id,
            title: sTitle,
            description: sDescription,
            order: i,
            adults: adults,
            children: children,
            peopleCount: totalGuests || 0,
          })
          .returning();
        createdServices.push({ ...service, items: [] });
      }

      return { meal, createdServices };
    });

    revalidatePath(`/event/${input.slug}`);
    return { ...result.meal, services: result.createdServices };
  }
);

export const updateMealAction = createSafeAction(updateMealSchema, async (input) => {
  await verifyAccess(input.slug, "meal:update", input.key, input.token);

  const updated = await db.transaction(async (tx) => {
    // 1. Fetch old meal to see if guests changed
    const current = await tx.query.meals.findFirst({
      where: eq(meals.id, input.id),
    });
    if (!current) {
      throw new Error("Repas non trouvé");
    }

    const oldAdults = current.adults;
    const oldChildren = current.children;
    const newAdults = input.adults ?? oldAdults;
    const newChildren = input.children ?? oldChildren;

    // Reserved for future cascade logic
    const _guestsChanged = newAdults !== oldAdults || newChildren !== oldChildren;

    // 2. Update meal
    const [updatedMeal] = await tx
      .update(meals)
      .set({
        date: input.date,
        title: input.title,
        adults: input.adults,
        children: input.children,
        time: input.time,
        address: input.address,
      })
      .where(eq(meals.id, input.id))
      .returning();

    // 3. Cascade to services removed to respect "initialization only" propagation rule.
    // Future adjustments to service guests should be made at the service level.

    return updatedMeal;
  });

  revalidatePath(`/event/${input.slug}`);
  return updated;
});

export const deleteMealAction = createSafeAction(deleteMealSchema, async (input) => {
  await verifyAccess(input.slug, "meal:delete", input.key, input.token);
  await db.delete(meals).where(eq(meals.id, input.id)).returning();
  revalidatePath(`/event/${input.slug}`);
  return { success: true };
});
