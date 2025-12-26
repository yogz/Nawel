"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { logChange } from "@/lib/logger";
import { services } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import { createServiceSchema, serviceSchema, deleteServiceSchema } from "./schemas";
import { createSafeAction } from "@/lib/action-utils";

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
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const updateData: any = {};
  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.peopleCount !== undefined) {
    updateData.peopleCount = input.peopleCount;
  }

  const [updated] = await db
    .update(services)
    .set(updateData)
    .where(eq(services.id, input.id))
    .returning();
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
