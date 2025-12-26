import { z } from "zod";
import {
  sanitizeText,
  sanitizeStrictText,
  sanitizeSlug,
  sanitizeEmoji,
  sanitizeKey,
} from "@/lib/sanitize";

// Sanitized string schemas
const safeText = (maxLength = 500) => z.string().transform((val) => sanitizeText(val, maxLength));
const safeStrictText = (maxLength = 100) =>
  z.string().transform((val) => sanitizeStrictText(val, maxLength));
const safeSlug = z.string().transform((val) => sanitizeSlug(val, 50));
const safeEmoji = z.string().transform((val) => sanitizeEmoji(val));
const safeKey = z.string().transform((val) => sanitizeKey(val, 100));

const dateSchema = z
  .union([z.string(), z.date()])
  .transform((val) => {
    if (val instanceof Date) {
      return val.toISOString().split("T")[0];
    }
    return val;
  })
  .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" });

export const baseInput = z.object({
  key: safeKey.optional(),
  slug: safeSlug,
});

export const createMealSchema = baseInput.extend({
  date: dateSchema,
  title: safeText(200).optional(),
});

export const createMealWithServicesSchema = baseInput.extend({
  date: dateSchema,
  title: safeText(200).optional(),
  services: z.array(safeStrictText(100)).min(1, "At least one service required"),
});

export const updateMealSchema = baseInput.extend({
  id: z.number().int().positive(),
  date: dateSchema.optional(),
  title: safeText(200).optional().nullable(),
});

export const createServiceSchema = baseInput.extend({
  mealId: z.number().int().positive(),
  title: safeText(200),
  peopleCount: z.number().int().min(1).max(100).optional(),
});

export const serviceSchema = baseInput.extend({
  id: z.number().int().positive(),
  title: safeText(200).optional(),
  peopleCount: z.number().int().min(1).max(100).optional(),
});

export const deleteServiceSchema = baseInput.extend({
  id: z.number().int().positive(),
});

export const deleteMealSchema = baseInput.extend({
  id: z.number().int().positive(),
});

export const createPersonSchema = baseInput.extend({
  name: safeStrictText(50),
  emoji: safeEmoji.optional(),
});

export const updatePersonSchema = baseInput.extend({
  id: z.number().int().positive(),
  name: safeStrictText(50),
  emoji: safeEmoji.optional().nullable(),
});

export const deletePersonSchema = baseInput.extend({
  id: z.number().int().positive(),
});

export const createItemSchema = baseInput.extend({
  serviceId: z.number().int().positive(),
  name: safeText(200),
  quantity: safeText(50).optional(),
  note: safeText(500).optional(),
  price: z.number().min(0).max(100000).optional(),
});

export const updateItemSchema = baseInput.extend({
  id: z.number().int().positive(),
  name: safeText(200),
  quantity: safeText(50).optional().nullable(),
  note: safeText(500).optional().nullable(),
  price: z.number().min(0).max(100000).optional().nullable(),
  personId: z.number().int().positive().optional().nullable(),
});

export const deleteItemSchema = baseInput.extend({
  id: z.number().int().positive(),
});

export const assignItemSchema = baseInput.extend({
  id: z.number().int().positive(),
  personId: z.number().int().positive().nullable(),
});

export const reorderSchema = baseInput.extend({
  serviceId: z.number().int().positive(),
  itemIds: z.array(z.number().int().positive()),
});

export const moveItemSchema = baseInput.extend({
  itemId: z.number().int().positive(),
  targetServiceId: z.number().int().positive(),
  targetOrder: z.number().int().min(0).optional(),
});

export const validateSchema = z.object({
  key: safeKey.optional(),
  slug: safeSlug.optional(),
});

export const getChangeLogsSchema = z.object({
  slug: safeSlug,
});

export const createEventSchema = z.object({
  slug: safeSlug,
  name: safeText(100),
  description: safeText(500).optional(),
  key: safeKey.optional(),
  creationMode: z.enum(["total", "classique", "apero", "zero"]).optional(),
  date: z.string().optional(),
  adults: z.number().int().min(0).max(1000).optional().default(0),
  children: z.number().int().min(0).max(1000).optional().default(0),
});

export const deleteEventSchema = baseInput;

// Ingredient schemas
export const generateIngredientsSchema = baseInput.extend({
  itemId: z.number().int().positive(),
  itemName: safeStrictText(100),
  peopleCount: z.number().int().min(1).max(50).optional(),
});

export const createIngredientSchema = baseInput.extend({
  itemId: z.number().int().positive(),
  name: safeText(100),
  quantity: safeText(50).optional(),
});

export const updateIngredientSchema = baseInput.extend({
  id: z.number().int().positive(),
  name: safeText(100).optional(),
  quantity: safeText(50).optional().nullable(),
  checked: z.boolean().optional(),
});

export const deleteIngredientSchema = baseInput.extend({
  id: z.number().int().positive(),
});

export const deleteAllIngredientsSchema = baseInput.extend({
  itemId: z.number().int().positive(),
});
