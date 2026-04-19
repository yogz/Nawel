import { isDatabaseError, ServiceUnavailableError } from "./errors";
import { type z } from "zod";

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
