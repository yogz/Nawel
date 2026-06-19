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
        // Optional so assessments stored before this field parse fine (lenient);
        // the prompt still asks the model to always set it.
        priority: z.enum(["high", "medium", "low"]).optional(),
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
  /** Meal date ("YYYY-MM-DD" or "common"), used for seasonality. */
  date: string | null;
  adults: number;
  children: number;
  services: MealAssessmentService[];
}

function buildUserPrompt(meal: MealAssessmentInput): string {
  const ae = meal.adults + 0.5 * meal.children;
  const lines: string[] = [];
  lines.push(`Meal: ${meal.title?.trim() || "(untitled)"}`);
  if (meal.date && meal.date !== "common") {
    lines.push(`Date: ${meal.date}`);
  }
  lines.push(`Expected: ${meal.adults} adults, ${meal.children} children (use AE = ${ae})`);
  lines.push("");
  lines.push("Already planned, grouped by the organizer's own category labels.");
  lines.push(
    'Quantities may appear in the quantity field OR inside the item name. "[needs a bringer]"' +
      " means the item is planned but nobody is bringing it yet (it still counts as planned)."
  );
  lines.push("");

  for (const service of meal.services) {
    lines.push(`- ${service.title?.trim() || "(uncategorized)"}:`);
    if (service.items.length === 0) {
      lines.push("    (nothing yet)");
      continue;
    }
    for (const item of service.items) {
      const qty = item.quantity?.trim() ? item.quantity.trim() : "(none)";
      const who = item.broughtBy?.trim() ? item.broughtBy.trim() : "[needs a bringer]";
      lines.push(`    • ${item.name} — qty: ${qty} — ${who}`);
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
  locale: string
): Promise<MealAssessment | null> {
  try {
    const { object } = await generateObject({
      // Direct Google provider (GOOGLE_GENERATIVE_AI_API_KEY) — same model as
      // gemini-search.ts (gemini-2.0-flash-lite was retired by Google).
      model: google("gemini-2.5-flash"),
      schema: mealAssessmentSchema,
      system: getMealAssessmentSystemPrompt(locale, {
        adults: meal.adults,
        children: meal.children,
      }),
      prompt: buildUserPrompt(meal),
      temperature: 0.2,
      experimental_repairText: repairJsonText,
    });
    return object;
  } catch (error) {
    logger.error("generateMealAssessment failed", error);
    return null;
  }
}
