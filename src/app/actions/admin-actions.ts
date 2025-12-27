"use server";

import { db } from "@/lib/db";
import { events, meals, services, people, items, ingredientCache, user } from "@drizzle/schema";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { eq, count, desc, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSafeAction, withErrorThrower } from "@/lib/action-utils";
import {
  updateEventAdminSchema,
  deleteEventAdminSchema,
  deleteCacheEntrySchema,
  updateCacheEntrySchema,
  deleteUserAdminSchema,
  toggleUserBanAdminSchema,
} from "./schemas";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Non authentifié");
  }

  if (session.user.role !== "admin") {
    throw new Error("Accès refusé - Rôle admin requis");
  }

  return session;
}

export type EventWithStats = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  adminKey: string | null;
  adults: number;
  children: number;
  createdAt: Date;
  mealsCount: number;
  servicesCount: number;
  peopleCount: number;
  itemsCount: number;
  owner?: {
    name: string;
    email: string;
  } | null;
};

export const getAllEventsAction = withErrorThrower(async (): Promise<EventWithStats[]> => {
  await requireAdmin();

  const allEvents = await db.query.events.findMany({
    with: {
      owner: true,
    },
    orderBy: (events, { desc }) => [desc(events.createdAt)],
  });

  const eventsWithStats: EventWithStats[] = await Promise.all(
    allEvents.map(async (event) => {
      const [mealsResult] = await db
        .select({ count: count() })
        .from(meals)
        .where(eq(meals.eventId, event.id));

      const [peopleResult] = await db
        .select({ count: count() })
        .from(people)
        .where(eq(people.eventId, event.id));

      const servicesResult = await db
        .select({ count: count() })
        .from(services)
        .innerJoin(meals, eq(services.mealId, meals.id))
        .where(eq(meals.eventId, event.id));

      const itemsResult = await db
        .select({ count: count() })
        .from(items)
        .innerJoin(services, eq(items.serviceId, services.id))
        .innerJoin(meals, eq(services.mealId, meals.id))
        .where(eq(meals.eventId, event.id));

      return {
        id: event.id,
        slug: event.slug,
        name: event.name,
        description: event.description,
        adminKey: event.adminKey,
        adults: event.adults,
        children: event.children,
        createdAt: event.createdAt,
        mealsCount: mealsResult?.count ?? 0,
        servicesCount: servicesResult[0]?.count ?? 0,
        peopleCount: peopleResult?.count ?? 0,
        itemsCount: itemsResult[0]?.count ?? 0,
        owner: event.owner
          ? {
              name: event.owner.name,
              email: event.owner.email,
            }
          : null,
      };
    })
  );

  return eventsWithStats;
});

export const updateEventAdminAction = createSafeAction(updateEventAdminSchema, async (input) => {
  await requireAdmin();

  // Check slug uniqueness if it's being changed
  if (input.slug) {
    const existing = await db.query.events.findFirst({
      where: eq(events.slug, input.slug),
    });
    if (existing && existing.id !== input.id) {
      throw new Error("Ce slug est déjà utilisé par un autre événement.");
    }
  }

  await db
    .update(events)
    .set({
      name: input.name,
      description: input.description,
      ...(input.slug && { slug: input.slug }),
      ...(input.adminKey !== undefined && { adminKey: input.adminKey || null }),
      ...(input.adults !== undefined && { adults: input.adults }),
      ...(input.children !== undefined && { children: input.children }),
    })
    .where(eq(events.id, input.id));

  revalidatePath("/admin");
  return { success: true };
});

export const deleteEventAdminAction = createSafeAction(deleteEventAdminSchema, async (input) => {
  await requireAdmin();

  await db.delete(events).where(eq(events.id, input.id));

  revalidatePath("/admin");
});

// ==========================================
// Cache Admin Actions
// ==========================================

export type CacheEntry = {
  id: number;
  dishName: string;
  peopleCount: number;
  ingredients: string; // JSON string
  confirmations: number;
  createdAt: Date;
  updatedAt: Date;
};

export const getAllCacheEntriesAction = withErrorThrower(
  async (search?: string): Promise<CacheEntry[]> => {
    await requireAdmin();

    if (search && search.trim()) {
      return await db
        .select()
        .from(ingredientCache)
        .where(ilike(ingredientCache.dishName, `%${search.trim()}%`))
        .orderBy(desc(ingredientCache.updatedAt));
    }

    return await db.select().from(ingredientCache).orderBy(desc(ingredientCache.updatedAt));
  }
);

export const deleteCacheEntryAction = createSafeAction(deleteCacheEntrySchema, async (input) => {
  await requireAdmin();

  await db.delete(ingredientCache).where(eq(ingredientCache.id, input.id));

  revalidatePath("/admin/cache");
  return { success: true };
});

export const updateCacheEntryAction = createSafeAction(updateCacheEntrySchema, async (input) => {
  await requireAdmin();

  // Validate JSON structure
  try {
    const parsed = JSON.parse(input.ingredients);
    if (!Array.isArray(parsed)) {
      throw new Error("Les ingrédients doivent être un tableau");
    }
  } catch {
    throw new Error("Format JSON invalide");
  }

  await db
    .update(ingredientCache)
    .set({
      ingredients: input.ingredients,
      updatedAt: new Date(),
    })
    .where(eq(ingredientCache.id, input.id));

  revalidatePath("/admin/cache");
  return { success: true };
});

export const clearAllCacheAction = withErrorThrower(async () => {
  await requireAdmin();

  await db.delete(ingredientCache);

  revalidatePath("/admin/cache");
  return { success: true };
});

// ==========================================
// User Admin Actions
// ==========================================

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
  eventsCount: number;
  peopleCount: number;
};

export const getAllUsersAction = withErrorThrower(async (): Promise<AdminUser[]> => {
  await requireAdmin();

  const allUsers = await db.query.user.findMany({
    orderBy: (user, { desc }) => [desc(user.createdAt)],
  });

  const usersWithStats: AdminUser[] = await Promise.all(
    allUsers.map(async (u) => {
      const [eventsResult] = await db
        .select({ count: count() })
        .from(events)
        .where(eq(events.ownerId, u.id));

      const [peopleResult] = await db
        .select({ count: count() })
        .from(people)
        .where(eq(people.userId, u.id));

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role ?? "user",
        banned: u.banned,
        createdAt: u.createdAt,
        eventsCount: eventsResult?.count ?? 0,
        peopleCount: peopleResult?.count ?? 0,
      };
    })
  );

  return usersWithStats;
});

export const toggleUserBanAdminAction = createSafeAction(
  toggleUserBanAdminSchema,
  async (input) => {
    await requireAdmin();

    await db
      .update(user)
      .set({
        banned: input.banned,
        updatedAt: new Date(),
      })
      .where(eq(user.id, input.id));

    revalidatePath("/admin/users");
    return { success: true };
  }
);

export const deleteUserAdminAction = createSafeAction(deleteUserAdminSchema, async (input) => {
  await requireAdmin();

  await db.delete(user).where(eq(user.id, input.id));

  revalidatePath("/admin/users");
  return { success: true };
});

// ==========================================
// Model Comparison Admin Actions
// ==========================================

import { testModelWithPrompt, AVAILABLE_FREE_MODELS, type ModelTestResult } from "@/lib/openrouter";

export { AVAILABLE_FREE_MODELS, type ModelTestResult };

export const testModelsAction = withErrorThrower(
  async (
    models: string[],
    systemPrompt: string,
    userPrompt: string
  ): Promise<ModelTestResult[]> => {
    await requireAdmin();

    // Test tous les modèles en parallèle
    const results = await Promise.all(
      models.map((model) => testModelWithPrompt(model, systemPrompt, userPrompt))
    );

    return results;
  }
);
