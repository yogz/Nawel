"use server";

import { db } from "@/lib/db";
import {
  events,
  meals,
  services,
  people,
  items,
  ingredientCache,
  user,
  feedback,
} from "@drizzle/schema";
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
  deleteCitationAdminSchema,
  updateCitationAdminSchema,
  deleteFeedbackAdminSchema,
} from "./schemas";
import fs from "fs";
import path from "path";

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

  // Log deletion before removing the record
  const event = await db.query.events.findFirst({
    where: eq(events.id, input.id),
  });
  if (event) {
    const { logChange } = await import("@/lib/logger");
    await logChange("delete", "events", event.id, event);
  }

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
  ratingSum: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export const getAllCacheEntriesAction = withErrorThrower(
  async (search?: string): Promise<CacheEntry[]> => {
    await requireAdmin();

    if (search && search.trim()) {
      return (await db
        .select()
        .from(ingredientCache)
        .where(ilike(ingredientCache.dishName, `%${search.trim()}%`))
        .orderBy(desc(ingredientCache.updatedAt))) as CacheEntry[];
    }

    return (await db
      .select()
      .from(ingredientCache)
      .orderBy(desc(ingredientCache.updatedAt))) as CacheEntry[];
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

import { testModelWithPrompt, type ModelTestResult } from "@/lib/openrouter";

export const testModelsAction = withErrorThrower(
  async (
    models: string[],
    systemPrompt: string,
    userPrompt: string
  ): Promise<ModelTestResult[]> => {
    await requireAdmin();

    if (process.env.NODE_ENV === "development") {
      console.log("\n========== MODEL COMPARISON TEST ==========");
      console.log("Models:", models);
      console.log("\n--- System Prompt ---");
      console.log(systemPrompt);
      console.log("\n--- User Prompt ---");
      console.log(userPrompt);
      console.log("============================================\n");
    }

    // Test tous les modèles en parallèle
    const results = await Promise.all(
      models.map((model) => testModelWithPrompt(model, systemPrompt, userPrompt))
    );

    // Log des résultats
    if (process.env.NODE_ENV === "development") {
      console.log("\n========== RESULTS ==========");
      results
        .sort((a, b) => a.responseTimeMs - b.responseTimeMs)
        .forEach((result, index) => {
          const status = result.success ? "✓" : "✗";
          console.log(`\n[${status}] #${index + 1} ${result.model} (${result.responseTimeMs}ms)`);
          if (result.success) {
            console.log("Ingredients:", JSON.stringify(result.ingredients, null, 2));
          } else {
            console.log("Error:", result.error);
          }
          if (result.rawResponse) {
            console.log("Raw:", result.rawResponse);
          }
        });
      console.log("\n==============================\n");
    }

    return results;
  }
);

// ==========================================
// Citation Admin Actions
// ==========================================

export const deleteCitationAdminAction = createSafeAction(
  deleteCitationAdminSchema,
  async (input) => {
    await requireAdmin();

    const filePath = path.join(process.cwd(), "src/data/citations-v3.json");

    if (!fs.existsSync(filePath)) {
      throw new Error("Fichier de citations introuvable.");
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const citationsData = JSON.parse(fileContent) as {
      version?: number;
      items: Array<{ id: string; text: string; author: string }>;
    };

    const initialLength = citationsData.items.length;
    citationsData.items = citationsData.items.filter((item) => item.id !== input.id);

    if (citationsData.items.length === initialLength) {
      throw new Error("Citation introuvable.");
    }

    // Mise à jour de la version pour forcer le rafraîchissement côté client si nécessaire
    citationsData.version = (citationsData.version || 0) + 1;

    fs.writeFileSync(filePath, JSON.stringify(citationsData, null, 2), "utf8");

    revalidatePath("/admin/citations");
    return { success: true };
  }
);

export const updateCitationAdminAction = createSafeAction(
  updateCitationAdminSchema,
  async (input) => {
    await requireAdmin();

    const filePath = path.join(process.cwd(), "src/data/citations-v3.json");

    if (!fs.existsSync(filePath)) {
      throw new Error("Fichier de citations introuvable.");
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const citationsData = JSON.parse(fileContent) as { version?: number; items: any[] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemIndex = citationsData.items.findIndex((item: any) => item.id === input.id);

    if (itemIndex === -1) {
      throw new Error("Citation introuvable.");
    }

    // Mise à jour de l'item avec les nouvelles valeurs
    const currentItem = citationsData.items[itemIndex];

    // Mise à jour des champs de base
    if (input.updates.type !== undefined) {
      currentItem.type = input.updates.type;
    }
    if (input.updates.tone !== undefined) {
      currentItem.tone = input.updates.tone;
    }
    if (input.updates.category !== undefined) {
      currentItem.category = input.updates.category;
    }
    if (input.updates.tags !== undefined) {
      currentItem.tags = input.updates.tags;
    }
    if (input.updates.rating !== undefined) {
      currentItem.rating = input.updates.rating;
    }

    // Mise à jour de original
    if (input.updates.original) {
      if (input.updates.original.lang !== undefined) {
        currentItem.original.lang = input.updates.original.lang;
      }
      if (input.updates.original.text !== undefined) {
        currentItem.original.text = input.updates.original.text;
      }
    }

    // Mise à jour de localized
    if (input.updates.localized) {
      currentItem.localized = {
        ...currentItem.localized,
        ...input.updates.localized,
      };
    }

    // Mise à jour de attribution
    if (input.updates.attribution) {
      currentItem.attribution = {
        ...currentItem.attribution,
        ...input.updates.attribution,
      };
    }

    citationsData.items[itemIndex] = currentItem;

    // Mise à jour de la version pour forcer le rafraîchissement côté client
    citationsData.version = (citationsData.version || 0) + 1;

    fs.writeFileSync(filePath, JSON.stringify(citationsData, null, 2), "utf8");

    revalidatePath("/admin/citations");
    return { success: true, item: currentItem };
  }
);

// ==========================================
// Feedback Admin Actions
// ==========================================

export type AdminFeedback = {
  id: number;
  userId: string | null;
  content: string;
  userAgent: string | null;
  url: string | null;
  createdAt: Date;
  user?: {
    name: string;
    email: string;
  } | null;
};

export const getAllFeedbackAction = withErrorThrower(async (): Promise<AdminFeedback[]> => {
  await requireAdmin();

  const allFeedback = await db.query.feedback.findMany({
    with: {
      user: true,
    },
    orderBy: (feedback, { desc }) => [desc(feedback.createdAt)],
  });

  return allFeedback.map((f) => ({
    id: f.id,
    userId: f.userId,
    content: f.content,
    userAgent: f.userAgent,
    url: f.url,
    createdAt: f.createdAt,
    user: f.user
      ? {
          name: f.user.name,
          email: f.user.email,
        }
      : null,
  }));
});

export const deleteFeedbackAdminAction = createSafeAction(
  deleteFeedbackAdminSchema,
  async (input) => {
    await requireAdmin();

    await db.delete(feedback).where(eq(feedback.id, input.id));

    revalidatePath("/admin/feedback");
    return { success: true };
  }
);
