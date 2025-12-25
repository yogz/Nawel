"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ingredients, ingredientCache } from "@/drizzle/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { verifyEventAccess } from "./shared";
import {
    generateIngredientsSchema,
    createIngredientSchema,
    updateIngredientSchema,
    deleteIngredientSchema,
    deleteAllIngredientsSchema,
} from "./schemas";
import { withErrorThrower } from "@/lib/action-utils";
import { generateIngredients as generateFromAI, GeneratedIngredient } from "@/lib/openrouter";

// Normalize dish name for cache key (lowercase, trimmed, no extra spaces)
function normalizeDishName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, " ");
}

// Cache TTL: 30 days in milliseconds
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const generateIngredientsAction = withErrorThrower(
    async (input: z.infer<typeof generateIngredientsSchema>) => {
        await verifyEventAccess(input.slug, input.key);

        // First, delete existing ingredients for this item
        await db.delete(ingredients).where(eq(ingredients.itemId, input.itemId));

        const normalizedName = normalizeDishName(input.itemName);
        const peopleCount = input.peopleCount || 4;
        const now = new Date();

        // Check cache for this dish + people count
        const [cached] = await db
            .select()
            .from(ingredientCache)
            .where(
                and(
                    eq(ingredientCache.dishName, normalizedName),
                    eq(ingredientCache.peopleCount, peopleCount),
                    gt(ingredientCache.expiresAt, now)
                )
            )
            .limit(1);

        let generatedIngredients: GeneratedIngredient[];

        if (cached) {
            // Cache hit - use cached ingredients
            console.log(`[Cache] HIT for "${normalizedName}" (${peopleCount} pers.)`);
            generatedIngredients = JSON.parse(cached.ingredients);
        } else {
            // Cache miss - call AI
            console.log(`[Cache] MISS for "${normalizedName}" (${peopleCount} pers.)`);
            generatedIngredients = await generateFromAI(input.itemName, peopleCount);

            if (generatedIngredients.length === 0) {
                throw new Error("Impossible de générer les ingrédients. Réessayez.");
            }

            // Store in cache only if we have at least 3 ingredients (quality threshold)
            if (generatedIngredients.length >= 3) {
                const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);
                await db.insert(ingredientCache).values({
                    dishName: normalizedName,
                    peopleCount,
                    ingredients: JSON.stringify(generatedIngredients),
                    expiresAt,
                });
                console.log(`[Cache] Stored "${normalizedName}" (${peopleCount} pers.) until ${expiresAt.toISOString()}`);
            }
        }

        if (generatedIngredients.length === 0) {
            throw new Error("Impossible de générer les ingrédients. Réessayez.");
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
        return inserted;
    }
);

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
