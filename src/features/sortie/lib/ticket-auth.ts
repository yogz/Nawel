import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { outings, participants, tickets } from "@drizzle/sortie-schema";

export type TicketAuthDecision =
  | { ok: true; reason: "owner" | "organizer" | "outing_participant" }
  | {
      ok: false;
      reason:
        | "not_found"
        | "revoked"
        | "outing_cancelled"
        | "not_authorized"
        | "anonymous_outing"
        | "no_session_user";
    };

export type TicketAuthInput = {
  ticketId: string;
  sessionUserId: string | null;
};

/**
 * Décision d'accès à un billet pour un user authentifié.
 *
 * Règles (toutes doivent être vraies) :
 *   1. Le ticket existe (sinon `not_found`)
 *   2. Il n'est pas révoqué (`revokedAt IS NULL`)
 *   3. La sortie n'est pas annulée (`status !== 'cancelled'` AND `cancelledAt IS NULL`)
 *   4. La sortie a un créateur loggé (`creatorUserId IS NOT NULL`) — on refuse
 *      les billets d'outings 100% anonymes : l'organisateur identifié est le
 *      seul actor habilité à uploader/révoquer, son inexistence rend le billet
 *      ingérable
 *   5. La session porte un userId (`sessionUserId IS NOT NULL`) — la règle
 *      "billets accessibles uniquement aux comptes" exclut totalement le
 *      cookie-only path
 *   6. ET l'une des conditions :
 *      - L'organisateur (`outing.creatorUserId === sessionUserId`)
 *      - Si scope='participant' : le détenteur (`ticket.participant.userId === sessionUserId`)
 *      - Si scope='outing' : un participant actif (`response IN ('yes','handle_own')`)
 *        avec `userId === sessionUserId` existe sur la sortie
 *
 * Retourne aussi les données du ticket utiles pour streamer (mimeType, blobUrl,
 * envelope crypto, checksum, originalFilename) afin que la route /api/tickets/[id]/download
 * n'ait pas à re-faire le SELECT.
 */
export async function authorizeTicketAccess(input: TicketAuthInput): Promise<{
  decision: TicketAuthDecision;
  ticket: typeof tickets.$inferSelect | null;
  outingId: string | null;
}> {
  if (!input.sessionUserId) {
    return { decision: { ok: false, reason: "no_session_user" }, ticket: null, outingId: null };
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, input.ticketId),
  });
  if (!ticket) {
    return { decision: { ok: false, reason: "not_found" }, ticket: null, outingId: null };
  }
  if (ticket.revokedAt !== null) {
    return { decision: { ok: false, reason: "revoked" }, ticket, outingId: ticket.outingId };
  }

  // Outing + participant lookups dépendent uniquement du ticket déjà
  // chargé : on les fire en parallèle. Le participantPromise dispatch sur
  // le scope — owner pour 'participant', membership active pour 'outing'.
  const participantPromise =
    ticket.scope === "participant"
      ? ticket.participantId
        ? db.query.participants.findFirst({
            where: eq(participants.id, ticket.participantId),
          })
        : Promise.resolve(undefined)
      : db.query.participants.findFirst({
          where: and(
            eq(participants.outingId, ticket.outingId),
            eq(participants.userId, input.sessionUserId),
            inArray(participants.response, ["yes", "handle_own"])
          ),
        });

  const [outing, participantRow] = await Promise.all([
    db.query.outings.findFirst({ where: eq(outings.id, ticket.outingId) }),
    participantPromise,
  ]);

  if (!outing) {
    return { decision: { ok: false, reason: "not_found" }, ticket, outingId: ticket.outingId };
  }
  if (outing.status === "cancelled" || outing.cancelledAt !== null) {
    return {
      decision: { ok: false, reason: "outing_cancelled" },
      ticket,
      outingId: ticket.outingId,
    };
  }
  if (!outing.creatorUserId) {
    return {
      decision: { ok: false, reason: "anonymous_outing" },
      ticket,
      outingId: ticket.outingId,
    };
  }

  if (outing.creatorUserId === input.sessionUserId) {
    return { decision: { ok: true, reason: "organizer" }, ticket, outingId: ticket.outingId };
  }

  if (ticket.scope === "participant") {
    // CHECK constraint exclut participantId NULL ici, mais on garde la
    // branche defense-in-depth si la contrainte saute (migration manquée).
    if (!ticket.participantId) {
      return {
        decision: { ok: false, reason: "not_authorized" },
        ticket,
        outingId: ticket.outingId,
      };
    }
    if (participantRow && participantRow.userId === input.sessionUserId) {
      return { decision: { ok: true, reason: "owner" }, ticket, outingId: ticket.outingId };
    }
    return {
      decision: { ok: false, reason: "not_authorized" },
      ticket,
      outingId: ticket.outingId,
    };
  }

  // scope === 'outing' : participantRow contient une membership active
  // si elle existe, sinon undefined → refus.
  if (participantRow) {
    return {
      decision: { ok: true, reason: "outing_participant" },
      ticket,
      outingId: ticket.outingId,
    };
  }

  return {
    decision: { ok: false, reason: "not_authorized" },
    ticket,
    outingId: ticket.outingId,
  };
}

/**
 * Liste les billets visibles pour un user sur une sortie donnée. Utile à
 * la page outing pour afficher la section "Mes billets" sans avoir à appeler
 * `authorizeTicketAccess` ticket par ticket.
 *
 * Les billets organisateur (= tous les billets de la sortie) ne sont PAS
 * filtrés ici : la page côté organisateur fait sa propre query plus large.
 */
export async function listTicketsVisibleToUser(args: {
  outingId: string;
  sessionUserId: string;
}): Promise<(typeof tickets.$inferSelect)[]> {
  const myParticipant = await db.query.participants.findFirst({
    where: and(
      eq(participants.outingId, args.outingId),
      eq(participants.userId, args.sessionUserId)
    ),
  });
  if (!myParticipant) {
    return [];
  }
  const isActive = myParticipant.response === "yes" || myParticipant.response === "handle_own";

  const rows = await db.query.tickets.findMany({
    where: and(eq(tickets.outingId, args.outingId), isNull(tickets.revokedAt)),
  });
  return rows.filter((t) => {
    if (t.scope === "participant") {
      return t.participantId === myParticipant.id;
    }
    return isActive;
  });
}
