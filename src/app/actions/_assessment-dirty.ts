import "server-only";

import { db } from "@/lib/db";
import { meals } from "@drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Stamps a meal's debounce clock so the assessment cron will (re)evaluate it
 * once edits settle. Best-effort: a failure here must never break the mutation
 * that triggered it, so errors are swallowed and logged.
 */
export async function stampMealDirty(mealId: number): Promise<void> {
  try {
    await db.update(meals).set({ itemsChangedAt: new Date() }).where(eq(meals.id, mealId));
  } catch (error) {
    logger.error("stampMealDirty failed", error);
  }
}

/**
 * Same as {@link stampMealDirty} but resolves the owning meal from a service id
 * in a single UPDATE (no extra round-trip).
 */
export async function stampMealDirtyByService(serviceId: number): Promise<void> {
  try {
    await db.execute(
      sql`UPDATE meals SET items_changed_at = now()
          WHERE id = (SELECT meal_id FROM services WHERE id = ${serviceId})`
    );
  } catch (error) {
    logger.error("stampMealDirtyByService failed", error);
  }
}
