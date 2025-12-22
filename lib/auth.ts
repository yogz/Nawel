export function assertWriteAccess(key: string | undefined | null, eventKey: string | null) {
  if (!eventKey) {
    throw new Error("Event has no admin key configured");
  }
  if (!key || key !== eventKey) {
    throw new Error("Unauthorized");
  }
}

export function isWriteKeyValid(key: string | undefined | null, eventKey: string | null) {
  if (!eventKey) return false;
  return key === eventKey;
}
