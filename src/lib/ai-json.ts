import { logger } from "./logger";

/**
 * Strips markdown code blocks from JSON text.
 * Some models (like Mistral) wrap JSON responses in ```json ... ``` blocks.
 */
export function stripMarkdownCodeBlocks(text: string): string {
  const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
  const match = text.trim().match(codeBlockRegex);
  if (match) {
    return match[1].trim();
  }
  return text;
}

/**
 * Repair callback for generateObject that handles markdown-wrapped JSON.
 * Returns null to let the original error propagate when nothing was repaired.
 */
export async function repairJsonText({ text }: { text: string }): Promise<string | null> {
  const stripped = stripMarkdownCodeBlocks(text);
  if (stripped !== text) {
    logger.debug("Repaired JSON by stripping markdown code blocks");
    return stripped;
  }
  return null;
}
