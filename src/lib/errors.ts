/**
 * Custom error class for database-related issues.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Well-known error codes surfaced to the client for i18n.
 * The client inspects `error.code` (or a prefix on `error.message`)
 * to render a translated message.
 */
export const ERROR_CODES = {
  SERVICE_UNAVAILABLE: "error.serviceUnavailable",
} as const;

export class ServiceUnavailableError extends Error {
  readonly code = ERROR_CODES.SERVICE_UNAVAILABLE;
  constructor() {
    super(ERROR_CODES.SERVICE_UNAVAILABLE);
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Checks if an error is likely related to a database connection or availability issue.
 * Specifically targets errors from the 'postgres' driver.
 */
export function isDatabaseError(error: unknown): boolean {
  if (error instanceof DatabaseError) {
    return true;
  }

  const err = error as Record<string, unknown> | null;
  const errorMessage = String(err?.message || "").toLowerCase();
  const errorStack = String(err?.stack || "").toLowerCase();

  const dbKeywords = [
    "connection refused",
    "connection timeout",
    "deadlock detected",
    "database does not exist",
    "role does not exist",
    "password authentication failed",
    "could not connect to server",
    "socket hangs up",
    "enotfound",
    "etimedout",
    "econnrefused",
    "dns timeout",
    "address not found",
    "neon.tech",
  ];

  return dbKeywords.some(
    (keyword) => errorMessage.includes(keyword) || errorStack.includes(keyword)
  );
}
