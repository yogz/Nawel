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
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
  time: z.string().optional(),
  address: safeText(500).optional(),
});

export const createMealWithServicesSchema = baseInput.extend({
  date: dateSchema,
  title: safeText(200).optional(),
  services: z.array(safeStrictText(100)).min(1, "At least one service required"),
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
  time: z.string().optional(),
  address: safeText(500).optional(),
});

export const updateMealSchema = baseInput.extend({
  id: z.number().int().positive(),
  date: dateSchema.optional(),
  title: safeText(200).optional().nullable(),
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
  time: z.string().optional().nullable(),
  address: safeText(500).optional().nullable(),
});

export const createServiceSchema = baseInput.extend({
  mealId: z.number().int().positive(),
  title: safeText(200),
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
  peopleCount: z.number().int().min(0).max(1000).optional(),
});

export const serviceSchema = baseInput.extend({
  id: z.number().int().positive(),
  title: safeText(200).optional(),
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
  peopleCount: z.number().int().min(0).max(1000).optional(),
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
  userId: z.string().optional(),
});

export const claimPersonSchema = baseInput.extend({
  personId: z.number().int().positive(),
});

export const unclaimPersonSchema = claimPersonSchema;

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

export const toggleItemCheckedSchema = baseInput.extend({
  id: z.number().int().positive(),
  checked: z.boolean(),
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
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
  peopleCount: z.number().int().min(0).max(1000).optional(),
  locale: z.string().optional(),
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

export const updateEventAdminSchema = z.object({
  id: z.number().int().positive(),
  name: safeText(100),
  description: safeText(500).optional().nullable(),
  slug: safeSlug.optional(),
  adminKey: safeKey.optional().nullable(),
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
});

export const deleteEventAdminSchema = z.object({
  id: z.number().int().positive(),
});

export const updateUserSchema = z.object({
  name: safeStrictText(100),
});

export const deleteUserSchema = z.object({
  confirm: z.boolean(),
});

export const deleteUserAdminSchema = z.object({
  id: z.string(),
});

export const toggleUserBanAdminSchema = z.object({
  id: z.string(),
  banned: z.boolean(),
});

// Admin Cache schemas
export const deleteCacheEntrySchema = z.object({
  id: z.number().int().positive(),
});

export const updateCacheEntrySchema = z.object({
  id: z.number().int().positive(),
  ingredients: z.string().min(2, "JSON invalide"), // JSON string of ingredients
});

// Audit Logs schemas - validated enums to prevent injection
export const auditTableNames = [
  "events",
  "meals",
  "services",
  "items",
  "people",
  "ingredients",
] as const;

export const auditActions = ["create", "update", "delete"] as const;

export const getAuditLogsSchema = z.object({
  tableName: z.enum(auditTableNames).optional(),
  action: z.enum(auditActions).optional(),
  userId: z.string().optional(),
});

export const deleteAuditLogsSchema = z
  .object({
    olderThanDays: z.number().int().min(1).max(365).optional(),
    deleteAll: z.boolean().optional(),
  })
  .refine((data) => data.olderThanDays !== undefined || data.deleteAll === true, {
    message: "Either olderThanDays or deleteAll must be provided",
  });
