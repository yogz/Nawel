import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants } from "@drizzle/sortie-schema";
import { ensureParticipantTokenHash } from "./cookie-token";

/**
 * Récupère le participant qui matche la viewer-identity sur une sortie :
 *   - si user logué → match sur userId
 *   - sinon → match sur cookieTokenHash
 *
 * Retourne aussi `userId` et `cookieTokenHash` pour que les actions qui
 * écrivent dans auditLog n'aient pas à re-faire un getSession + headers.
 *
 * Helper unique partagé par debt/purchase/payment-method actions —
 * la sémantique d'identité est volontairement le seul endroit où elle
 * se définit.
 */
export async function getCurrentParticipant(outingId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const cookieTokenHash = await ensureParticipantTokenHash();
  const userId = session?.user?.id ?? null;
  const participant = await db.query.participants.findFirst({
    where: and(
      eq(participants.outingId, outingId),
      userId ? eq(participants.userId, userId) : eq(participants.cookieTokenHash, cookieTokenHash)
    ),
  });
  return { participant: participant ?? null, userId, cookieTokenHash };
}
