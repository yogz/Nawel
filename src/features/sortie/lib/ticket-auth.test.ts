import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeTicketAccess } from "./ticket-auth";

// On mocke entièrement `db` : ticket-auth ne fait que des `findFirst` lookups
// sans transaction ni write. Chaque test pilote `mockResolvedValueOnce` dans
// l'ordre des appels :
//   1. tickets.findFirst → le ticket
//   2. outings.findFirst → la sortie parente
//   3. participants.findFirst → owner ou membership active selon le scope
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      tickets: { findFirst: vi.fn() },
      outings: { findFirst: vi.fn() },
      participants: { findFirst: vi.fn() },
    },
  },
}));

import { db } from "@/lib/db";

const ORGANIZER_ID = "user_organizer";
const OWNER_ID = "user_owner";
const STRANGER_ID = "user_stranger";
const OUTING_ID = "outing-uuid";
const PARTICIPANT_ID = "participant-uuid";

// Drizzle infers very rich row types ; au runtime ticket-auth ne lit qu'un
// sous-ensemble de colonnes. Cast `as never` pour le mock — sans ça il faut
// reconstruire 30+ champs par test.
function makeTicket(overrides: Record<string, unknown> = {}): never {
  return {
    id: "ticket-uuid",
    outingId: OUTING_ID,
    scope: "participant",
    participantId: PARTICIPANT_ID,
    blobUrl: "https://blob.local/ct",
    originalFilename: "billet.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1234,
    checksum: "abc",
    encryptionKeyId: "v1",
    iv: "iv",
    authTag: "tag",
    uploadedByUserId: ORGANIZER_ID,
    revokedAt: null,
    revokedByUserId: null,
    createdAt: new Date(),
    ...overrides,
  } as never;
}

function makeOuting(overrides: Record<string, unknown> = {}): never {
  return {
    id: OUTING_ID,
    creatorUserId: ORGANIZER_ID,
    status: "open",
    cancelledAt: null,
    ...overrides,
  } as never;
}

describe("authorizeTicketAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("denies when no session user", async () => {
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: null,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("no_session_user");
    }
    // Aucun lookup DB ne doit être tenté — on coupe avant de tape la DB.
    expect(db.query.tickets.findFirst).not.toHaveBeenCalled();
  });

  it("denies when ticket does not exist", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(undefined);
    const result = await authorizeTicketAccess({
      ticketId: "ghost-uuid",
      sessionUserId: STRANGER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("not_found");
    }
  });

  it("denies when ticket is revoked", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(
      makeTicket({ revokedAt: new Date() })
    );
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: ORGANIZER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("revoked");
    }
    // Doit court-circuiter avant le lookup outing — on ne déchiffre pas un
    // ticket révoqué même pour l'organisateur.
    expect(db.query.outings.findFirst).not.toHaveBeenCalled();
  });

  it("denies when outing is cancelled (status)", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(makeTicket());
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(
      makeOuting({ status: "cancelled" })
    );
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: ORGANIZER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("outing_cancelled");
    }
  });

  it("denies when outing has cancelledAt set", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(makeTicket());
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(
      makeOuting({ cancelledAt: new Date() })
    );
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: ORGANIZER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("outing_cancelled");
    }
  });

  it("denies when outing has no creatorUserId (anonymous outing)", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(makeTicket());
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(
      makeOuting({ creatorUserId: null })
    );
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: ORGANIZER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("anonymous_outing");
    }
  });

  it("allows the organizer (creator) for any scope", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(
      makeTicket({ scope: "outing", participantId: null })
    );
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    // Membership lookup runs in parallel with outing lookup, so the
    // participant fetch is fired even when the organizer branch will win.
    vi.mocked(db.query.participants.findFirst).mockResolvedValueOnce(undefined);
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: ORGANIZER_ID,
    });
    expect(result.decision.ok).toBe(true);
    if (result.decision.ok) {
      expect(result.decision.reason).toBe("organizer");
    }
  });

  it("allows the owner of a participant-scoped ticket", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(makeTicket());
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    vi.mocked(db.query.participants.findFirst).mockResolvedValueOnce({
      id: PARTICIPANT_ID,
      userId: OWNER_ID,
    } as never);
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: OWNER_ID,
    });
    expect(result.decision.ok).toBe(true);
    if (result.decision.ok) {
      expect(result.decision.reason).toBe("owner");
    }
  });

  it("denies a stranger on a participant-scoped ticket", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(makeTicket());
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    vi.mocked(db.query.participants.findFirst).mockResolvedValueOnce({
      id: PARTICIPANT_ID,
      userId: OWNER_ID,
    } as never);
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: STRANGER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("not_authorized");
    }
  });

  it("denies a stranger when the participant row was orphaned (userId null)", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(makeTicket());
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    vi.mocked(db.query.participants.findFirst).mockResolvedValueOnce({
      id: PARTICIPANT_ID,
      userId: null,
    } as never);
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: STRANGER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("not_authorized");
    }
  });

  it("denies a participant-scoped ticket whose participantId is missing (defense in depth)", async () => {
    // La CHECK constraint DB exclut ce cas, mais ticket-auth doit refuser
    // proprement plutôt que crasher si la contrainte saute (migration ratée,
    // dump corrompu).
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(
      makeTicket({ participantId: null })
    );
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: STRANGER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("not_authorized");
    }
  });

  it("allows an active participant on an outing-scoped ticket", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(
      makeTicket({ scope: "outing", participantId: null })
    );
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    // findFirst retourne la row participant si la WHERE clause matche
    // (outingId + userId + response IN ('yes','handle_own')) — on simule un
    // hit en retournant un objet non-vide.
    vi.mocked(db.query.participants.findFirst).mockResolvedValueOnce({
      id: "active-uuid",
    } as never);
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: STRANGER_ID,
    });
    expect(result.decision.ok).toBe(true);
    if (result.decision.ok) {
      expect(result.decision.reason).toBe("outing_participant");
    }
  });

  it("denies a non-active participant on an outing-scoped ticket", async () => {
    // findFirst sur participants avec response IN ('yes','handle_own') ET
    // userId match ne renvoie rien si le user a répondu 'no' ou 'interested'
    // (la WHERE clause filtre directement).
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(
      makeTicket({ scope: "outing", participantId: null })
    );
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    vi.mocked(db.query.participants.findFirst).mockResolvedValueOnce(undefined);
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: STRANGER_ID,
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("not_authorized");
    }
  });

  it("denies a non-participant of the outing on an outing-scoped ticket", async () => {
    vi.mocked(db.query.tickets.findFirst).mockResolvedValueOnce(
      makeTicket({ scope: "outing", participantId: null })
    );
    vi.mocked(db.query.outings.findFirst).mockResolvedValueOnce(makeOuting());
    vi.mocked(db.query.participants.findFirst).mockResolvedValueOnce(undefined);
    const result = await authorizeTicketAccess({
      ticketId: "ticket-uuid",
      sessionUserId: "user_outsider",
    });
    expect(result.decision.ok).toBe(false);
    if (!result.decision.ok) {
      expect(result.decision.reason).toBe("not_authorized");
    }
  });
});
