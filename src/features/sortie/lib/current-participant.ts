import { and, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants } from "@drizzle/sortie-schema";
import { ensureParticipantTokenHash } from "./cookie-token";

/**
 * Récupère le participant qui matche la viewer-identity sur une sortie :
 *   - si user logué → match sur userId OR cookieTokenHash
 *   - sinon → match sur cookieTokenHash
 *
 * Le double bras pour les users logués est nécessaire : un user qui a
 * RSVP en anonyme (row participante rattachée au cookieTokenHash, sans
 * userId) puis qui s'est logué plus tard ne back-fille pas
 * automatiquement `userId` sur la row participant. Sans `or(...)`, les
 * actions debt/purchase répondent "Non autorisé" alors qu'il est bien
 * le débiteur. Cohérent avec `rsvpAction` (`participant-actions.ts`).
 *
 * Retourne aussi `userId` et `cookieTokenHash` pour que les actions qui
 * écrivent dans auditLog n'aient pas à re-faire un getSession + headers.
 */
export async function getCurrentParticipant(outingId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const cookieTokenHash = await ensureParticipantTokenHash();
  const userId = session?.user?.id ?? null;
  const identityClause = userId
    ? or(eq(participants.userId, userId), eq(participants.cookieTokenHash, cookieTokenHash))!
    : eq(participants.cookieTokenHash, cookieTokenHash);
  const participant = await db.query.participants.findFirst({
    where: and(eq(participants.outingId, outingId), identityClause),
  });
  return { participant: participant ?? null, userId, cookieTokenHash };
}
