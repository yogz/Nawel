import { isDatabaseError } from "./errors";
import { type z } from "zod";

/**
 * A wrapper that catches database errors and re-throws them with a user-friendly message.
 * This is useful for maintaining compatibility with existing frontend code that uses try/catch.
 */
export function withErrorThrower<Args extends unknown[], T>(action: (...args: Args) => Promise<T>) {
  return async (...args: Args): Promise<T> => {
    try {
      return await action(...args);
    } catch (error: unknown) {
      if (isDatabaseError(error)) {
        throw new Error(
          "Désolé, le service est temporairement indisponible. Notre base de données ne répond pas. Veuillez réessayer dans quelques instants."
        );
      }
      throw error;
    }
  };
}

export function createSafeAction<T extends z.ZodType<unknown>, R>(
  schema: T,
  action: (data: z.infer<T>) => Promise<R>
) {
  return async (input: z.infer<T>): Promise<R> => {
    // 1. Validate Input
    const validatedData = schema.parse(input);

    // 2. Execute with Error Handling
    return withErrorThrower(() => action(validatedData))();
  };
}
