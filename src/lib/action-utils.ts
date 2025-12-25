import { DatabaseError, isDatabaseError } from "./errors";

export type ActionResponse<T> = {
  data: T | null;
  error: string | null;
  status: "success" | "error";
};

/**
 * A wrapper for server actions to provide consistent error handling,
 * especially for database-related issues.
 */
export async function safeAction<T, Args extends any[]>(
  action: (...args: Args) => Promise<T>,
  ...args: Args
): Promise<ActionResponse<T>> {
  try {
    const data = await action(...args);
    return {
      data,
      error: null,
      status: "success",
    };
  } catch (error: any) {
    console.error("Action Error:", error);

    if (isDatabaseError(error)) {
      return {
        data: null,
        error:
          "Désolé, le service est temporairement indisponible. Notre base de données ne répond pas. Veuillez réessayer dans quelques instants.",
        status: "error",
      };
    }

    // Generic error message for other types of errors
    // We can refine this to pass specific error messages if needed
    return {
      data: null,
      error: error.message || "Une erreur inattendue est survenue.",
      status: "error",
    };
  }
}

/**
 * Alternative approach: An action factory/wrapper that returns a neuen function.
 * This is often more convenient for defining actions.
 */
export function withErrorHandler<Args extends any[], T>(action: (...args: Args) => Promise<T>) {
  return async (...args: Args): Promise<ActionResponse<T>> => {
    try {
      const data = await action(...args);
      return {
        data,
        error: null,
        status: "success",
      };
    } catch (error: any) {
      console.error("Server Action Error:", error);

      if (isDatabaseError(error)) {
        return {
          data: null,
          error:
            "Désolé, le service est temporairement indisponible. Notre base de données ne répond pas. Veuillez réessayer dans quelques instants.",
          status: "error",
        };
      }

      return {
        data: null,
        error: error.message || "Une erreur inattendue est survenue.",
        status: "error",
      };
    }
  };
}

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
