import { and, eq, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { debts, outings, participants } from "@drizzle/sortie-schema";

export type BulkDebtRow = {
  id: string;
  amountCents: number;
  status: "pending" | "declared_paid" | "confirmed";
  outingId: string;
  outingTitle: string;
  outingShortId: string;
  outingSlug: string | null;
  debtorParticipantId: string;
  creditorParticipantId: string;
};

export type DebtsBetweenUsers = {
  /** Dettes où `callerUserId` est débiteur, `otherUserId` créditeur. */
  asDebtor: BulkDebtRow[];
  /** Dettes où `callerUserId` est créditeur, `otherUserId` débiteur. */
  asCreditor: BulkDebtRow[];
};

const debtorP = alias(participants, "bulk_debtor_p");
const creditorP = alias(participants, "bulk_creditor_p");

/**
 * Double-bind authz : pour qu'une dette remonte, le participant débiteur ET
 * le participant créditeur doivent être chacun rattachés au userId attendu.
 * Empêche un caller qui devine un userId arbitraire de muter des dettes
 * qu'il ne possède pas (cf. revue sécu — point 1).
 *
 * Exclut systématiquement les outings `cancelled` (mirror de
 * `revealIbanAction` et de la query wallet existante).
 */
export async function getDebtsBetweenUsers(args: {
  callerUserId: string;
  otherUserId: string;
  statuses?: Array<"pending" | "declared_paid" | "confirmed">;
}): Promise<DebtsBetweenUsers> {
  const statuses = args.statuses ?? ["pending"];

  const baseSelect = {
    id: debts.id,
    amountCents: debts.amountCents,
    status: debts.status,
    outingId: outings.id,
    outingTitle: outings.title,
    outingShortId: outings.shortId,
    outingSlug: outings.slug,
    debtorParticipantId: debts.debtorParticipantId,
    creditorParticipantId: debts.creditorParticipantId,
  };

  const [asDebtor, asCreditor] = await Promise.all([
    db
      .select(baseSelect)
      .from(debts)
      .innerJoin(outings, and(eq(outings.id, debts.outingId), ne(outings.status, "cancelled")))
      .innerJoin(
        debtorP,
        and(eq(debtorP.id, debts.debtorParticipantId), eq(debtorP.userId, args.callerUserId))
      )
      .innerJoin(
        creditorP,
        and(eq(creditorP.id, debts.creditorParticipantId), eq(creditorP.userId, args.otherUserId))
      )
      .where(inArray(debts.status, statuses)),
    db
      .select(baseSelect)
      .from(debts)
      .innerJoin(outings, and(eq(outings.id, debts.outingId), ne(outings.status, "cancelled")))
      .innerJoin(
        debtorP,
        and(eq(debtorP.id, debts.debtorParticipantId), eq(debtorP.userId, args.otherUserId))
      )
      .innerJoin(
        creditorP,
        and(eq(creditorP.id, debts.creditorParticipantId), eq(creditorP.userId, args.callerUserId))
      )
      .where(inArray(debts.status, statuses)),
  ]);

  return { asDebtor, asCreditor };
}
