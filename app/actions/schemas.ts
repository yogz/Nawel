import { z } from "zod";

export const baseInput = z.object({
    key: z.string().optional(),
    slug: z.string(),
});

export const createDaySchema = baseInput.extend({
    date: z.string().min(1, "Date required"),
    title: z.string().optional(),
});

export const createMealSchema = baseInput.extend({
    dayId: z.number(),
    title: z.string().min(1, "Title required"),
});

export const mealSchema = baseInput.extend({
    id: z.number(),
    title: z.string().min(1)
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
});

export const deleteEventSchema = baseInput;
