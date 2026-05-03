import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { participants, tickets } from "@drizzle/sortie-schema";
import { displayNameOf } from "@/features/sortie/lib/participant-name";

/**
 * Vue dénormalisée d'un billet pour l'UI : on n'expose JAMAIS `blobUrl`,
 * `iv`, `authTag`, `encryptionKeyId` côté client. Le download passe par la
 * route `/api/sortie/tickets/[id]/download` qui re-vérifie l'auth.
 */
export type TicketView = {
  id: string;
  scope: "participant" | "outing";
  participantId: string | null;
  participantDisplayName: string | null;
  mimeType: string;
  sizeBytes: number;
  originalFilename: string | null;
  createdAt: Date;
  revokedAt: Date | null;
};

/**
 * Liste tous les billets d'une sortie, vue organisateur. Inclut les billets
 * révoqués pour la traçabilité (l'UI affichera un état "révoqué" plutôt que
 * de les masquer). Pas de filtre — l'organisateur a tout droit sur sa sortie.
 */
export async function listTicketsForOrganizer(outingId: string): Promise<TicketView[]> {
  const rows = await db.query.tickets.findMany({
    where: eq(tickets.outingId, outingId),
    orderBy: [asc(tickets.scope), asc(tickets.createdAt)],
    with: {
      participant: {
        columns: { id: true, anonName: true },
        with: { user: { columns: { name: true } } },
      },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    scope: t.scope,
    participantId: t.participantId,
    participantDisplayName: t.participant ? displayNameOf(t.participant) : null,
    mimeType: t.mimeType,
    sizeBytes: t.sizeBytes,
    originalFilename: t.originalFilename,
    createdAt: t.createdAt,
    revokedAt: t.revokedAt,
  }));
}

/**
 * Le filtre métier est dupliqué avec `ticket-auth.ts` à dessein : la requête
 * SQL doit pouvoir scope direct, et `authorizeTicketAccess` reste l'unique
 * source de vérité au moment du download.
 */
export async function listTicketsForParticipant(args: {
  outingId: string;
  participantId: string;
  participantResponse: "yes" | "no" | "handle_own" | "interested";
}): Promise<TicketView[]> {
  const isActive = args.participantResponse === "yes" || args.participantResponse === "handle_own";

  const personalCondition = and(
    eq(tickets.scope, "participant"),
    eq(tickets.participantId, args.participantId)
  );
  const scopeCondition = isActive
    ? or(personalCondition, eq(tickets.scope, "outing"))
    : personalCondition;

  const rows = await db.query.tickets.findMany({
    where: and(eq(tickets.outingId, args.outingId), isNull(tickets.revokedAt), scopeCondition),
    orderBy: [asc(tickets.scope), asc(tickets.createdAt)],
  });

  return rows.map((t) => ({
    id: t.id,
    scope: t.scope,
    participantId: t.participantId,
    participantDisplayName: null,
    mimeType: t.mimeType,
    sizeBytes: t.sizeBytes,
    originalFilename: t.originalFilename,
    createdAt: t.createdAt,
    revokedAt: t.revokedAt,
  }));
}

export type TicketRecipientCandidate = {
  participantId: string;
  displayName: string;
  hasAccount: boolean;
  hasEmail: boolean;
};

export async function listTicketRecipientCandidates(
  outingId: string
): Promise<TicketRecipientCandidate[]> {
  const rows = await db.query.participants.findMany({
    where: and(
      eq(participants.outingId, outingId),
      inArray(participants.response, ["yes", "handle_own"])
    ),
    orderBy: [asc(participants.respondedAt)],
    with: { user: { columns: { name: true, email: true } } },
  });
  return rows.map((p) => ({
    participantId: p.id,
    displayName: displayNameOf(p) ?? "Anonyme",
    hasAccount: Boolean(p.userId),
    hasEmail: Boolean(p.user?.email ?? p.anonEmail),
  }));
}
