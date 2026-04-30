import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, participants } from "@drizzle/sortie-schema";

/**
 * Inspecte l'état d'un device anon pour décider du parcours de reset :
 *
 *   - `hasReclaimableEmail` : au moins une row (participant ou sortie
 *     créée) du device a déjà un email ou un userId rattaché. Permet à
 *     l'utilisateur de retrouver ses sorties via magic-link sans saisir
 *     d'email à nouveau.
 *   - `reclaimableEmail` : l'email à afficher dans le message rassurant
 *     ("connecte-toi avec **alice@x.com**"). Premier non-null trouvé.
 *   - `anonName` : prénom anon mémorisé sur ce device (pour personnaliser
 *     les copies du dialog).
 *   - `isCreatorWithoutEmail` : l'user est créateur d'au moins une sortie
 *     active (ni passée ni annulée) sans email ni userId rattaché. Cas
 *     bloquant — un reset sec lui ferait perdre la gestion de la sortie.
 *
 * Toutes ces infos sont dérivables d'un seul aller-retour DB groupé.
 */
export async function getResetReclaimability(cookieTokenHash: string) {
  const [participantRows, creatorRows] = await Promise.all([
    db.query.participants.findMany({
      where: eq(participants.cookieTokenHash, cookieTokenHash),
      columns: { anonEmail: true, anonName: true, userId: true },
      limit: 100,
    }),
    db.query.outings.findMany({
      where: eq(outings.creatorCookieTokenHash, cookieTokenHash),
      columns: {
        creatorAnonEmail: true,
        creatorAnonName: true,
        creatorUserId: true,
        status: true,
      },
      limit: 100,
    }),
  ]);

  const reclaimableEmail =
    participantRows.find((r) => r.anonEmail)?.anonEmail ??
    creatorRows.find((r) => r.creatorAnonEmail)?.creatorAnonEmail ??
    null;

  const hasReclaimableEmail = Boolean(
    reclaimableEmail ||
    participantRows.some((r) => r.userId) ||
    creatorRows.some((r) => r.creatorUserId)
  );

  const anonName =
    participantRows.find((r) => r.anonName)?.anonName ??
    creatorRows.find((r) => r.creatorAnonName)?.creatorAnonName ??
    null;

  const isCreatorWithoutEmail = creatorRows.some(
    (r) =>
      !r.creatorAnonEmail && !r.creatorUserId && r.status !== "past" && r.status !== "cancelled"
  );

  return {
    hasReclaimableEmail,
    reclaimableEmail,
    anonName,
    isCreatorWithoutEmail,
  };
}
