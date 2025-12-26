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
