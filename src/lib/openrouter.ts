import { generateObject } from "ai";
import { aiModel } from "./ai";
import { logger } from "./logger";
import {
  ingredientsSchema,
  categorizationSchema,
  getSystemPrompt,
  getCategorizationSystemPrompt,
  getCategorizationUserPrompt,
  getUserPrompt,
  INGREDIENT_CATEGORIES,
} from "./prompts";

export interface GeneratedIngredient {
  name: string;
  quantity?: string;
  category?: string;
}

/**
 * Génère une liste d'ingrédients pour un plat donné.
 */
export async function generateIngredients(
  itemName: string,
  peopleCount: number = 4,
  details?: {
    description?: string;
    note?: string;
    systemPrompt?: string;
    userPrompt?: string;
    locale?: string;
  }
): Promise<GeneratedIngredient[]> {
  const guestDescription = details?.description || `${peopleCount} personnes`;
  const locale = details?.locale || "fr";

  const systemPrompt = details?.systemPrompt || getSystemPrompt(locale, { guestDescription });

  const userPrompt = details?.userPrompt || getUserPrompt(locale, { itemName });

  logger.debug("\n--- AI REQUEST (Vercel AI SDK) ---");
  logger.debug("System:", systemPrompt);
  logger.debug("User:", userPrompt);

  const systemWithFormatting = `${systemPrompt}\n\nIMPORTANT: Tu dois retourner UNIQUEMENT l'objet JSON contenant les données. Ne retourne PAS la définition du schéma JSON, ne mets pas de texte avant ou après.`;

  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: ingredientsSchema,
      system: systemWithFormatting,
      prompt: userPrompt,
      temperature: 0.3,
    });

    logger.debug("--- AI RESPONSE (Structured) ---");
    logger.debug(JSON.stringify(object, null, 2));

    return object.ingredients;
  } catch (error) {
    console.error("Vercel AI SDK error (generateIngredients):", error);
    return [];
  }
}

/**
 * Catégorise une liste d'articles de supermarché.
 */
export async function categorizeItems(
  itemNames: string[],
  locale: string = "fr"
): Promise<Array<{ name: string; category: string }>> {
  if (itemNames.length === 0) return [];

  const systemPrompt = getCategorizationSystemPrompt(locale);
  const userPrompt = getCategorizationUserPrompt(locale, itemNames);

  logger.debug("\n--- AI CATEGORIZATION REQUEST ---");

  const systemWithFormatting = `${systemPrompt}\n\nIMPORTANT: Tu dois retourner UNIQUEMENT l'objet JSON contenant les données. Ne retourne PAS la définition du schéma JSON, ne mets pas de texte avant ou après.`;

  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: categorizationSchema,
      system: systemWithFormatting,
      prompt: userPrompt,
      temperature: 0.1,
    });

    return object.items;
  } catch (error) {
    console.error("Vercel AI SDK error (categorizeItems):", error);
    return [];
  }
}

// Maintenu pour la compatibilité avec l'admin-dashboard
export const AVAILABLE_FREE_MODELS = ["mistral/mistral-nemo"] as const;

export interface ModelTestResult {
  model: string;
  success: boolean;
  ingredients: GeneratedIngredient[];
  responseTimeMs: number;
  error?: string;
  rawResponse?: string;
}

/**
 * Teste un modèle (utilisé par l'admin dashboard).
 */
export async function testModelWithPrompt(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<ModelTestResult> {
  const startTime = performance.now();

  try {
    const { object } = await generateObject({
      model: aiModel,
      schema: ingredientsSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });

    const responseTimeMs = Math.round(performance.now() - startTime);

    return {
      model: "mistral/mistral-nemo",
      success: true,
      ingredients: object.ingredients,
      responseTimeMs,
      rawResponse: JSON.stringify(object, null, 2),
    };
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - startTime);
    return {
      model: "mistral/mistral-nemo",
      success: false,
      ingredients: [],
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Génère le prompt système par défaut.
 */
export function getDefaultSystemPrompt(
  guestDescription: string = "4 personnes",
  locale: string = "fr"
): string {
  return getSystemPrompt(locale, { guestDescription });
}

/**
 * Génère le prompt utilisateur par défaut.
 */
export function getDefaultUserPrompt(dishName: string, locale: string = "fr"): string {
  return getUserPrompt(locale, { itemName: dishName });
}
