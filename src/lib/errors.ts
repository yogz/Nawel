/**
 * Custom error class for database-related issues.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Checks if an error is likely related to a database connection or availability issue.
 * Specifically targets errors from the 'postgres' driver.
 */
export function isDatabaseError(error: any): boolean {
  if (error instanceof DatabaseError) {
    return true;
  }

  const errorMessage = error?.message?.toLowerCase() || "";
  const errorStack = error?.stack?.toLowerCase() || "";

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
