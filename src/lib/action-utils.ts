import { isDatabaseError, ServiceUnavailableError } from "./errors";
import type { z } from "zod";

// Premier message d'erreur disponible dans un ZodError flat — utile pour
// les form actions qui veulent rendre un message simple `error: string`
// plutôt qu'une map de fieldErrors complète.
export function pickFirstZodError(err: z.ZodError): string {
  const flat = err.flatten();
  return Object.values(flat.fieldErrors).flat()[0] ?? "Données invalides.";
}

/**
 * A wrapper that catches database errors and re-throws them with a translatable code.
 * The client should detect `error.message === "error.serviceUnavailable"` and render
 * a translated message via next-intl.
 */
export function withErrorThrower<Args extends unknown[], T>(action: (...args: Args) => Promise<T>) {
  return async (...args: Args): Promise<T> => {
    try {
      return await action(...args);
    } catch (error: unknown) {
      if (isDatabaseError(error)) {
        throw new ServiceUnavailableError();
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
