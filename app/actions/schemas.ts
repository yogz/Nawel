import { z } from "zod";

const dateSchema = z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) return val.toISOString().split('T')[0];
    return val;
}).refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" });


export const baseInput = z.object({
    key: z.string().optional(),
    slug: z.string(),
});

export const createDaySchema = baseInput.extend({
    date: dateSchema,
    title: z.string().optional(),
});

export const createDayWithMealsSchema = baseInput.extend({
    date: dateSchema,
    title: z.string().optional(),
    meals: z.array(z.string()).min(1, "At least one meal required"),
});

export const updateDaySchema = baseInput.extend({
    id: z.number(),
    date: dateSchema.optional(),
    title: z.string().optional().nullable(),
});

export const createMealSchema = baseInput.extend({
    dayId: z.number(),
    title: z.string().min(1, "Title required"),
    peopleCount: z.number().int().min(1).optional(),
});

export const mealSchema = baseInput.extend({
    id: z.number(),
    title: z.string().min(1).optional(),
    peopleCount: z.number().int().min(1).optional(),
});

export const deleteMealSchema = baseInput.extend({
    id: z.number()
});

export const createPersonSchema = baseInput.extend({
    name: z.string().min(1),
    emoji: z.string().optional()
});

export const updatePersonSchema = baseInput.extend({
    id: z.number(),
    name: z.string().min(1),
    emoji: z.string().optional().nullable(),
});

export const deletePersonSchema = baseInput.extend({
    id: z.number()
});

export const createItemSchema = baseInput.extend({
    mealId: z.number(),
    name: z.string().min(1),
    quantity: z.string().optional(),
    note: z.string().optional(),
    price: z.number().optional(),
});

export const updateItemSchema = baseInput.extend({
    id: z.number(),
    name: z.string().min(1),
    quantity: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    personId: z.number().optional().nullable(),
});

export const deleteItemSchema = baseInput.extend({
    id: z.number()
});

export const assignItemSchema = baseInput.extend({
    id: z.number(),
    personId: z.number().nullable()
});

export const reorderSchema = baseInput.extend({
    mealId: z.number(),
    itemIds: z.array(z.number())
});

export const moveItemSchema = baseInput.extend({
    itemId: z.number(),
    targetMealId: z.number(),
    targetOrder: z.number().optional(),
});

export const validateSchema = z.object({
    key: z.string().optional(),
    slug: z.string().optional()
});

export const getChangeLogsSchema = z.object({
    slug: z.string()
});

export const createEventSchema = z.object({
    slug: z.string().min(1).max(100),
    name: z.string().min(1),
    description: z.string().optional(),
    key: z.string().optional(),
    creationMode: z.enum(["total", "classique", "apero", "zero"]).optional(),
    date: z.string().optional(),
});

export const deleteEventSchema = baseInput;

// Ingredient schemas
export const generateIngredientsSchema = baseInput.extend({
    itemId: z.number(),
    itemName: z.string().min(1),
});

export const createIngredientSchema = baseInput.extend({
    itemId: z.number(),
    name: z.string().min(1),
    quantity: z.string().optional(),
});

export const updateIngredientSchema = baseInput.extend({
    id: z.number(),
    name: z.string().min(1).optional(),
    quantity: z.string().optional().nullable(),
    checked: z.boolean().optional(),
});

export const deleteIngredientSchema = baseInput.extend({
    id: z.number(),
});

export const deleteAllIngredientsSchema = baseInput.extend({
    itemId: z.number(),
});
