import { isDatabaseError } from "./errors";

/**
 * A wrapper that catches database errors and re-throws them with a user-friendly message.
 * This is useful for maintaining compatibility with existing frontend code that uses try/catch.
 */
export function withErrorThrower<Args extends any[], T>(action: (...args: Args) => Promise<T>) {
  return async (...args: Args): Promise<T> => {
    try {
      return await action(...args);
    } catch (error: any) {
      if (isDatabaseError(error)) {
        throw new Error(
          "Désolé, le service est temporairement indisponible. Notre base de données ne répond pas. Veuillez réessayer dans quelques instants."
        );
      }
      throw error;
    }
  };
}
