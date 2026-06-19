import { google } from "@ai-sdk/google";

/**
 * Shared AI model for CoList ingredient generation and categorization.
 *
 * Uses the direct Google Generative AI provider (GOOGLE_GENERATIVE_AI_API_KEY),
 * the same path as the meal assessment ("Ce qu'il manque") in meal-assessment.ts.
 * We dropped the Vercel AI Gateway: on the free tier it no longer serves Gemini
 * (BYOK + paid credits required), and the previously configured
 * `google/gemini-2.0-flash-lite` was retired upstream.
 */
export const aiModel = google("gemini-2.5-flash-lite");
