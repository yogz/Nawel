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
  .refine((val) => val === "common" || !isNaN(Date.parse(val)), { message: "Invalid date format" });

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
  image: z.string().optional(),
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
  image: z.string().optional().nullable(),
});

export const updatePersonStatusSchema = baseInput.extend({
  personId: z.number().int().positive(),
  status: z.enum(["confirmed", "declined", "maybe"]),
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
  personId: z.number().int().positive().optional().nullable(),
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
  name: safeText(100),
  description: safeText(500).optional(),
  creationMode: z.enum(["total", "classique", "apero", "vacation"]).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  address: safeText(500).optional(),
  adults: z.number().int().min(0).max(1000).optional().default(0),
  children: z.number().int().min(0).max(1000).optional().default(0),
  duration: z.number().int().min(1).max(31).optional().default(7),
  mealTitles: z
    .object({
      common: safeStrictText(100).optional(),
      lunch: safeStrictText(100).optional(),
      dinner: safeStrictText(100).optional(),
    })
    .optional(),
  locale: z.string().optional(),
});

export const deleteEventSchema = baseInput;

export const updateEventSchema = baseInput.extend({
  name: safeText(100).optional(),
  description: safeText(500).optional().nullable(),
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
});

// Combined schema for updating event + first meal in one action
export const updateEventWithMealSchema = baseInput.extend({
  name: safeText(100).optional(),
  description: safeText(500).optional().nullable(),
  adults: z.number().int().min(0).max(1000).optional(),
  children: z.number().int().min(0).max(1000).optional(),
  // Meal fields
  mealId: z.number().int().positive().optional(),
  date: dateSchema.optional(),
  time: z.string().optional().nullable(),
  address: safeText(500).optional().nullable(),
});

// Ingredient schemas
export const generateIngredientsSchema = baseInput.extend({
  itemId: z.number().int().positive(),
  itemName: safeStrictText(100),
  note: safeText(500).optional(),
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

export const saveAIFeedbackSchema = baseInput.extend({
  itemId: z.number().int().positive(),
  rating: z.number().int().min(1).max(10),
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
  name: safeStrictText(100).optional(),
  language: z.string().optional(),
  emoji: safeEmoji.optional().nullable(),
});

export const deleteUserSchema = z.object({
  confirm: z.boolean(),
});

export const deleteUserAdminSchema = z.object({
  id: z.string(),
  deleteEvents: z.boolean(),
});

export const toggleUserBanAdminSchema = z.object({
  id: z.string(),
  banned: z.boolean(),
});

export const sendPasswordResetAdminSchema = z.object({
  id: z.string(),
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

export const deleteCitationAdminSchema = z.object({
  id: z.string(),
});

export const updateCitationAdminSchema = z.object({
  id: z.string(),
  updates: z.object({
    type: z.string().optional(),
    tone: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    rating: z.number().min(1).max(3).optional(),
    original: z
      .object({
        lang: z.string().optional(),
        text: z.string().optional(),
      })
      .optional(),
    localized: z.record(z.string()).optional(),
    attribution: z
      .object({
        author: z.string().nullable().optional(),
        work: z.string().nullable().optional(),
        year: z.number().nullable().optional(),
        origin: z.string().nullable().optional(),
        confidence: z.enum(["high", "medium", "low"]).optional(),
        origin_type: z.string().nullable().optional(),
        origin_qualifier: z.string().nullable().optional(),
      })
      .optional(),
  }),
});

export const submitFeedbackSchema = z.object({
  content: safeText(2000),
  url: z.string().optional(),
});

export const deleteFeedbackAdminSchema = z.object({
  id: z.number().int().positive(),
});

export const submitContactSchema = z.object({
  email: z.string().email(),
  content: safeText(2000),
  url: z.string().optional(),
});

export const createCostSchema = z.object({
  amount: z.number().min(0).max(1000000),
  category: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  date: z.date().optional(),
  frequency: z.enum(["once", "monthly", "yearly"]).default("once"),
});

export const toggleCostActiveAdminSchema = z.object({
  id: z.number().int().positive(),
  isActive: z.boolean(),
});

export const deleteCostAdminSchema = z.object({
  id: z.number().int().positive(),
});
