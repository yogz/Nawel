"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { type z } from "zod";
import { db } from "@/lib/db";
import { ingredients, ingredientCache } from "@drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import {
  type generateIngredientsSchema,
  type createIngredientSchema,
  type updateIngredientSchema,
  type deleteIngredientSchema,
  type deleteAllIngredientsSchema,
} from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";
import { generateIngredients as generateFromAI, type GeneratedIngredient } from "@/lib/openrouter";
import { auth } from "@/lib/auth-config";

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

// Minimum confirmations required before trusting cache
const MIN_CONFIRMATIONS = 3;

type IngredientData = {
  id: number;
  name: string;
  order: number;
  quantity: string | null;
  itemId: number;
  checked: boolean;
};

type GenerateResult = { success: true; data: IngredientData[] } | { success: false; error: string };

export async function generateIngredientsAction(
  input: z.infer<typeof generateIngredientsSchema>
): Promise<GenerateResult> {
  try {
    // Require authenticated user for AI generation
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { success: false, error: "Vous devez être connecté pour utiliser la génération IA." };
    }

    await verifyEventAccess(input.slug, input.key);

    // First, delete existing ingredients for this item
    await db.delete(ingredients).where(eq(ingredients.itemId, input.itemId));

    const normalizedName = normalizeDishName(input.itemName);
    const peopleCount = input.peopleCount || 4;

    // Check cache for this dish + people count
    const [cached] = await db
      .select()
      .from(ingredientCache)
      .where(
        and(
          eq(ingredientCache.dishName, normalizedName),
          eq(ingredientCache.peopleCount, peopleCount)
        )
      )
      .limit(1);

    let generatedIngredients: GeneratedIngredient[];

    if (cached && cached.confirmations >= MIN_CONFIRMATIONS) {
      // Cache is trusted (3+ confirmations) - use it directly
      console.log(
        `[Cache] TRUSTED HIT for "${normalizedName}" (${peopleCount} pers.) - ${cached.confirmations} confirmations`
      );
      generatedIngredients = JSON.parse(cached.ingredients);
    } else {
      // Need to call AI (either no cache or not enough confirmations)
      console.log(
        `[Cache] ${cached ? `VALIDATING (${cached.confirmations}/${MIN_CONFIRMATIONS})` : "MISS"} for "${normalizedName}" (${peopleCount} pers.)`
      );

      try {
        generatedIngredients = await generateFromAI(input.itemName, peopleCount);
      } catch (aiError) {
        console.error("[AI] Generation failed:", aiError);
        return { success: false, error: "L'IA n'a pas pu générer les ingrédients. Réessayez." };
      }

      if (!generatedIngredients || generatedIngredients.length === 0) {
        return { success: false, error: "L'IA n'a retourné aucun ingrédient. Réessayez." };
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
            console.log(
              `[Cache] CONFIRMED "${normalizedName}" (${newConfirmations}/${MIN_CONFIRMATIONS})`
            );
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
            console.log(
              `[Cache] REPLACED "${normalizedName}" - ingredients differ, reset to 1/${MIN_CONFIRMATIONS}`
            );
          }
        } else {
          // No cache exists - create new entry
          await db.insert(ingredientCache).values({
            dishName: normalizedName,
            peopleCount,
            ingredients: JSON.stringify(generatedIngredients),
            confirmations: 1,
          });
          console.log(`[Cache] CREATED "${normalizedName}" (1/${MIN_CONFIRMATIONS})`);
        }
      }
    }

    if (!generatedIngredients || generatedIngredients.length === 0) {
      return { success: false, error: "Aucun ingrédient généré. Réessayez." };
    }

    // Insert all ingredients
    const inserted = await db.transaction(async (tx) => {
      const results = [];
      for (let i = 0; i < generatedIngredients.length; i++) {
        const ing = generatedIngredients[i];
        const [created] = await tx
          .insert(ingredients)
          .values({
            itemId: input.itemId,
            name: ing.name,
            quantity: ing.quantity || null,
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
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez." };
  }
}

export const createIngredientAction = withErrorThrower(
  async (input: z.infer<typeof createIngredientSchema>) => {
    await verifyEventAccess(input.slug, input.key);

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
  }
);

export const updateIngredientAction = withErrorThrower(
  async (input: z.infer<typeof updateIngredientSchema>) => {
    await verifyEventAccess(input.slug, input.key);

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
  }
);

export const deleteIngredientAction = withErrorThrower(
  async (input: z.infer<typeof deleteIngredientSchema>) => {
    await verifyEventAccess(input.slug, input.key);

    await db.delete(ingredients).where(eq(ingredients.id, input.id));

    revalidatePath(`/event/${input.slug}`);
    return { success: true };
  }
);

export const deleteAllIngredientsAction = withErrorThrower(
  async (input: z.infer<typeof deleteAllIngredientsSchema>) => {
    await verifyEventAccess(input.slug, input.key);

    await db.delete(ingredients).where(eq(ingredients.itemId, input.itemId));

    revalidatePath(`/event/${input.slug}`);
    return { success: true };
  }
);
