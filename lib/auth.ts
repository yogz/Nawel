export function assertWriteAccess(key?: string | null) {
  const writeKey = process.env.WRITE_KEY;
  if (!writeKey) {
    throw new Error("WRITE_KEY is not configured");
  }
  if (!key || key !== writeKey) {
    throw new Error("Unauthorized");
  }
}

export function isWriteKeyValid(key?: string | null) {
  const writeKey = process.env.WRITE_KEY;
  if (!writeKey) return false;
  return key === writeKey;
}
