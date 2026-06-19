import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logger } from "./logger";
import { repairJsonText } from "./ai-json";
import { getMealAssessmentSystemPrompt } from "./prompts";

export const mealAssessmentSchema = z.object({
  sufficient: z.boolean(),
  summary: z.string(),
  missing: z
    .array(
      z.object({
        name: z.string(),
        suggestedQuantity: z.string(),
        reason: z.string(),
      })
    )
    .max(8),
});

export type MealAssessment = z.infer<typeof mealAssessmentSchema>;

export interface MealAssessmentItem {
  name: string;
  quantity: string | null;
  broughtBy: string | null;
}

export interface MealAssessmentService {
  title: string | null;
  items: MealAssessmentItem[];
}

export interface MealAssessmentInput {
  title: string | null;
  adults: number;
  children: number;
  services: MealAssessmentService[];
}

function buildUserPrompt(meal: MealAssessmentInput): string {
  const lines: string[] = [];
  lines.push(`Meal: ${meal.title?.trim() || "(untitled)"}`);
  lines.push(`Expected: ${meal.adults} adults, ${meal.children} children`);
  lines.push("");
  lines.push("Already planned (by category):");

  for (const service of meal.services) {
    lines.push(`- ${service.title?.trim() || "(uncategorized)"}:`);
    if (service.items.length === 0) {
      lines.push("    (nothing yet)");
      continue;
    }
    for (const item of service.items) {
      const qty = item.quantity?.trim() ? ` — ${item.quantity.trim()}` : "";
      const who = item.broughtBy?.trim()
        ? ` (brought by ${item.broughtBy.trim()})`
        : " (no volunteer yet)";
      lines.push(`    • ${item.name}${qty}${who}`);
    }
  }

  return lines.join("\n");
}

/**
 * Asks the AI what is still missing for a meal given who brings what and the
 * declared headcount. Returns null on any failure (caller decides what to do).
 * Generation language follows `locale` (the event's locale).
 */
export async function generateMealAssessment(
  meal: MealAssessmentInput,
  locale: string,
  opts?: { rethrow?: boolean }
): Promise<MealAssessment | null> {
  try {
    const { object } = await generateObject({
      // Direct Google provider (GOOGLE_GENERATIVE_AI_API_KEY), like
      // gemini-search.ts — the Vercel AI Gateway is not configured in prod.
      model: google("gemini-2.0-flash-lite"),
      schema: mealAssessmentSchema,
      system: getMealAssessmentSystemPrompt(locale, {
        adults: meal.adults,
        children: meal.children,
      }),
      prompt: buildUserPrompt(meal),
      temperature: 0.4,
      experimental_repairText: repairJsonText,
    });
    return object;
  } catch (error) {
    logger.error("generateMealAssessment failed", error);
    if (opts?.rethrow) {
      throw error;
    }
    return null;
  }
}
