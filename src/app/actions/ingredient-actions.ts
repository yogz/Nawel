"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/lib/db";
import { ingredients, ingredientCache, items, people } from "@drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyAccess } from "./shared";
import {
  generateIngredientsSchema,
  createIngredientSchema,
  updateIngredientSchema,
  deleteIngredientSchema,
  deleteAllIngredientsSchema,
} from "./schemas";
import { createSafeAction } from "@/lib/action-utils";
import { generateIngredients as generateFromAI, type GeneratedIngredient } from "@/lib/openrouter";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth-config";
import { AI_CACHE_MIN_CONFIRMATIONS } from "@/lib/constants";

// Normalize dish name for cache key (lowercase, trimmed, no extra spaces)
function normalizeDishName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

// Normalize ingredient name for comparison
function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim();
}

// Compare two ingredient lists - returns true if they have the same ingredient names
function ingredientsMatch(a: GeneratedIngredient[], b: GeneratedIngredient[]): boolean {
  const namesA = a.map((i) => normalizeIngredientName(i.name)).sort();
  const namesB = b.map((i) => normalizeIngredientName(i.name)).sort();
  if (namesA.length !== namesB.length) {
    return false;
  }
  return namesA.every((name, idx) => name === namesB[idx]);
}

type IngredientData = {
  id: number;
  name: string;
  order: number;
  quantity: string | null;
  itemId: number;
  checked: boolean;
  category: string | null;
};

type GenerateResult = { success: true; data: IngredientData[] } | { success: false; error: string };

export const generateIngredientsAction = createSafeAction(
  generateIngredientsSchema,
  async (input): Promise<GenerateResult> => {
    try {
      const t = await getTranslations({
        locale: input.locale || "fr",
        namespace: "Translations",
      });
      const tAi = await getTranslations({
        locale: input.locale || "fr",
        namespace: "EventDashboard.AI",
      });

      // Require authenticated user for AI generation
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session) {
        return {
          success: false,
          error: t("actions.notLoggedInAI"),
        };
      }

      if (!session.user.emailVerified) {
        return {
          success: false,
          error: t("actions.emailNotVerifiedAI"),
        };
      }

      const { event } = await verifyAccess(
        input.slug,
        "ingredient:generate",
        input.key,
        input.token
      );

      // First, delete existing ingredients for this item
      await db.delete(ingredients).where(eq(ingredients.itemId, input.itemId));

      const normalizedName = normalizeDishName(input.itemName);

      // Calculate Confirmed RSVP Count
      // We need to fetch all people for this event to count confirmed guests
      const eventPeople = await db.query.people.findMany({
        where: eq(people.eventId, event.id),
      });

      let rsvpCount = 0;
      for (const p of eventPeople) {
        if (p.status === "confirmed") {
          rsvpCount += 1 + (p.guest_adults || 0) + (p.guest_children || 0);
        }
      }

      // Priority Logic:
      // 1. input.peopleCount (passed from UI, which might be manual override or client-side calculation)
      // 2. Smart Count = MAX(input.peopleCount [if it came from meal/service], rsvpCount)

      const item = await db.query.items.findFirst({
        where: eq(items.id, input.itemId),
      });

      let finalPeopleCount = 4; // Default fallback
      let guestSource = "Défaut (4 pers.)";
      let guestDescription = "";

      // 1. Item Note / Quantity Field
      if (item?.quantity) {
        guestDescription = item.quantity;
        guestSource = "Article (champ quantité)";
        finalPeopleCount = 0;
      } else {
        // 2. Smart Count Logic
        const mealServiceCount = input.peopleCount || 0;

        finalPeopleCount = mealServiceCount > 0 ? mealServiceCount : 4;

        // If no explicit count passed (0), fallback to RSVP if available
        if (mealServiceCount === 0 && rsvpCount > 0) {
          finalPeopleCount = rsvpCount;
          guestSource = "Participants confirmés (RSVP)";
        } else if (mealServiceCount > 0) {
          guestSource = "Configuration (Manuel/Service)";
        }

        guestDescription = `${finalPeopleCount} personne${finalPeopleCount > 1 ? "s" : ""}`;
      }

      const systemPrompt = tAi("systemPrompt", { guestDescription });

      // Build user prompt with optional note indication
      const noteFromInput = input.note || item?.note;
      let userPrompt = tAi("userPrompt", { itemName: input.itemName });
      if (noteFromInput && noteFromInput.trim()) {
        userPrompt += `\n\n${tAi("noteIndication", { note: noteFromInput.trim() })}`;
      }

      // Check cache for this dish + people count
      // (Cache remains on peopleCount for now to keep it simple, but prompt will be detailed)
      // Use finalPeopleCount for cache key if possible, or input.peopleCount?
      // Just use finalPeopleCount for cache consistency with the prompt.
      const cacheCount = finalPeopleCount > 0 ? finalPeopleCount : input.peopleCount || 0;

      const [cached] = await db
        .select()
        .from(ingredientCache)
        .where(
          and(
            eq(ingredientCache.dishName, normalizedName),
            eq(ingredientCache.peopleCount, cacheCount)
          )
        )
        .limit(1);

      let generatedIngredients: GeneratedIngredient[];
      let finalCacheId: number | undefined = cached?.id;

      if (cached && cached.confirmations >= AI_CACHE_MIN_CONFIRMATIONS) {
        // Cache is trusted (3+ confirmations) - use it directly
        generatedIngredients = JSON.parse(cached.ingredients);
      } else {
        // Need to call AI (either no cache or not enough confirmations)
        try {
          generatedIngredients = await generateFromAI(input.itemName, cacheCount, {
            description: item?.quantity || undefined,
            note: input.note || item?.note || undefined,
            systemPrompt,
            userPrompt,
          });
        } catch (aiError) {
          console.error("[AI] Generation failed:", aiError);
          return {
            success: false,
            error: tAi.has("generationError")
              ? tAi("generationError")
              : t("actions.ingredientsGenerationFailed"),
          };
        }

        if (!generatedIngredients || generatedIngredients.length === 0) {
          return {
            success: false,
            error: t("actions.ingredientsGenerationFailed"),
          };
        }

        // Only cache if we have at least 3 ingredients (quality threshold)
        if (generatedIngredients.length >= 3) {
          if (cached) {
            // Compare with existing cache
            const cachedIngredients: GeneratedIngredient[] = JSON.parse(cached.ingredients);
            if (ingredientsMatch(generatedIngredients, cachedIngredients)) {
              // Same ingredients - increment confirmations
              const newConfirmations = cached.confirmations + 1;
              await db
                .update(ingredientCache)
                .set({
                  confirmations: newConfirmations,
                  updatedAt: new Date(),
                })
                .where(eq(ingredientCache.id, cached.id));
            } else {
              // Different ingredients - replace cache, reset confirmations
              await db
                .update(ingredientCache)
                .set({
                  ingredients: JSON.stringify(generatedIngredients),
                  confirmations: 1,
                  updatedAt: new Date(),
                })
                .where(eq(ingredientCache.id, cached.id));
            }
          } else {
            // No cache exists - create new entry
            const [newCache] = await db
              .insert(ingredientCache)
              .values({
                dishName: normalizedName,
                peopleCount: cacheCount,
                ingredients: JSON.stringify(generatedIngredients),
                confirmations: 1,
              })
              .returning();
            finalCacheId = newCache.id;
          }
        }
      }

      if (!generatedIngredients || generatedIngredients.length === 0) {
        return { success: false, error: t("actions.ingredientsGenerationFailed") };
      }

      // Insert all ingredients and link item to cache
      const inserted = await db.transaction(async (tx) => {
        // Update item with cacheId if we have one
        if (finalCacheId) {
          await tx.update(items).set({ cacheId: finalCacheId }).where(eq(items.id, input.itemId));
        }

        const results = [];
        for (let i = 0; i < generatedIngredients.length; i++) {
          const ing = generatedIngredients[i];
          const [created] = await tx
            .insert(ingredients)
            .values({
              itemId: input.itemId,
              name: ing.name,
              quantity: ing.quantity || null,
              category: ing.category || "misc",
              order: i,
            })
            .returning();
          results.push(created);
        }
        return results;
      });

      revalidatePath(`/event/${input.slug}`);
      return { success: true, data: inserted };
    } catch (error) {
      console.error("[generateIngredientsAction] Unexpected error:", error);
      const t = await getTranslations({
        locale: input.locale || "fr",
        namespace: "Translations",
      });
      return {
        success: false,
        error: t("actions.ingredientsGenerationFailed"),
      };
    }
  }
);

export const createIngredientAction = createSafeAction(createIngredientSchema, async (input) => {
  await verifyAccess(input.slug, "ingredient:create", input.key, input.token);

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number | null>`MAX(${ingredients.order})` })
    .from(ingredients)
    .where(eq(ingredients.itemId, input.itemId));
  const order = (maxOrder ?? -1) + 1;

  const [created] = await db
    .insert(ingredients)
    .values({
      itemId: input.itemId,
      name: input.name,
      quantity: input.quantity ?? null,
      order,
    })
    .returning();

  revalidatePath(`/event/${input.slug}`);
  return created;
});

export const updateIngredientAction = createSafeAction(updateIngredientSchema, async (input) => {
  await verifyAccess(input.slug, "ingredient:update", input.key, input.token);

  const [updated] = await db
    .update(ingredients)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.checked !== undefined && { checked: input.checked }),
    })
    .where(eq(ingredients.id, input.id))
    .returning();

  revalidatePath(`/event/${input.slug}`);
  return updated;
});

export const deleteIngredientAction = createSafeAction(deleteIngredientSchema, async (input) => {
  await verifyAccess(input.slug, "ingredient:delete", input.key, input.token);

  await db.delete(ingredients).where(eq(ingredients.id, input.id));

  revalidatePath(`/event/${input.slug}`);
  return { success: true };
});

export const deleteAllIngredientsAction = createSafeAction(
  deleteAllIngredientsSchema,
  async (input) => {
    await verifyAccess(input.slug, "ingredient:delete", input.key, input.token);

    await db.delete(ingredients).where(eq(ingredients.itemId, input.itemId));

    revalidatePath(`/event/${input.slug}`);
    return { success: true };
  }
);
