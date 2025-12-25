import { z } from "zod";

export function createAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (input: TInput) => Promise<TOutput>
) {
  return async (rawInput: unknown): Promise<TOutput> => {
    const input = schema.parse(rawInput);
    try {
      return await handler(input);
    } catch (error) {
      console.error("Action failed:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Une erreur est survenue");
    }
  };
}
