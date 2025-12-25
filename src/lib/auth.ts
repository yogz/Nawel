import { auth } from "./auth-config";
import { headers } from "next/headers";

export async function hasWriteAccess(
  key: string | undefined | null,
  event: { adminKey: string | null; ownerId: string | null }
) {
  // 1. Check if key is valid
  if (key && event.adminKey && key === event.adminKey) {
    return true;
  }

  // 2. Check if user is owner
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session && event.ownerId && session.user.id === event.ownerId) {
    return true;
  }

  return false;
}

export async function assertWriteAccess(
  key: string | undefined | null,
  event: { adminKey: string | null; ownerId: string | null }
) {
  if (!(await hasWriteAccess(key, event))) {
    throw new Error("Unauthorized");
  }
}

export function isWriteKeyValid(key: string | undefined | null, eventKey: string | null) {
  if (!eventKey) return false;
  return key === eventKey;
}
