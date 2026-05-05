import * as dotenv from "dotenv";
dotenv.config();
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  outings,
  participants,
  purchases,
  purchaseAllocations,
  debts,
} from "../../drizzle/sortie-schema";
import { user } from "../../drizzle/schema";
import { priceFor } from "../../src/features/sortie/lib/price-for";

async function main() {
  const shortId = process.argv[2];
  const newBuyerParticipantId = process.argv[3];
  const apply = process.argv.includes("--apply");
  if (!shortId || !newBuyerParticipantId) {
    console.error(
      "usage: tsx scripts/db/swap-purchaser.ts <shortId> <newBuyerParticipantId> [--apply]"
    );
    process.exit(1);
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    console.error(`Aucune sortie pour shortId=${shortId}`);
    process.exit(1);
  }

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (!purchase) {
    console.error("Aucun achat sur cette sortie.");
    process.exit(1);
  }

  if (purchase.purchaserParticipantId === newBuyerParticipantId) {
    console.log("Le nouveau payeur est déjà le payeur courant. Rien à faire.");
    process.exit(0);
  }

  const allocs = await db.query.purchaseAllocations.findMany({
    where: eq(purchaseAllocations.purchaseId, purchase.id),
  });

  const newBuyerHasAlloc = allocs.some((a) => a.participantId === newBuyerParticipantId);
  if (!newBuyerHasAlloc) {
    console.error(
      "Le nouveau payeur n'a pas d'allocation sur cet achat — refus (l'incohérence pourrait fausser le total)."
    );
    process.exit(1);
  }

  const allDebts = await db.query.debts.findMany({
    where: eq(debts.outingId, outing.id),
  });
  const nonPending = allDebts.filter((d) => d.status !== "pending");
  if (nonPending.length > 0) {
    console.error(
      `Refus : ${nonPending.length} dette(s) ont dépassé le status 'pending' (declared_paid/confirmed). Ne pas réécrire l'historique.`
    );
    process.exit(1);
  }

  const parts = await db
    .select({
      id: participants.id,
      anonName: participants.anonName,
      userName: user.name,
    })
    .from(participants)
    .leftJoin(user, eq(participants.userId, user.id))
    .where(eq(participants.outingId, outing.id));
  const nameOf = (id: string) => {
    const p = parts.find((pp) => pp.id === id);
    return p?.userName ?? p?.anonName ?? id;
  };

  const debtsByDebtor = new Map<string, number>();
  for (const a of allocs) {
    if (a.participantId === newBuyerParticipantId) {
      continue;
    }
    debtsByDebtor.set(
      a.participantId,
      (debtsByDebtor.get(a.participantId) ?? 0) + priceFor(purchase, a)
    );
  }
  const newDebtRows = Array.from(debtsByDebtor.entries())
    .filter(([, amount]) => amount > 0)
    .map(([participantId, amount]) => ({
      outingId: outing.id,
      debtorParticipantId: participantId,
      creditorParticipantId: newBuyerParticipantId,
      amountCents: amount,
    }));

  console.log(`\nSortie : ${outing.title} (${outing.shortId})`);
  console.log(
    `Payeur : ${nameOf(purchase.purchaserParticipantId)} → ${nameOf(newBuyerParticipantId)}`
  );
  console.log(`\nDettes à supprimer (${allDebts.length}) :`);
  allDebts.forEach((d) => {
    console.log(
      `  - ${nameOf(d.debtorParticipantId)} → ${nameOf(d.creditorParticipantId)} : ${(d.amountCents / 100).toFixed(2)} €`
    );
  });
  console.log(`\nDettes à créer (${newDebtRows.length}) :`);
  newDebtRows.forEach((d) => {
    console.log(
      `  - ${nameOf(d.debtorParticipantId)} → ${nameOf(d.creditorParticipantId)} : ${(d.amountCents / 100).toFixed(2)} €`
    );
  });

  if (!apply) {
    console.log("\n[dry-run] Relance avec --apply pour exécuter.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    await tx.delete(debts).where(eq(debts.outingId, outing.id));
    await tx
      .update(purchases)
      .set({ purchaserParticipantId: newBuyerParticipantId })
      .where(eq(purchases.id, purchase.id));
    if (newDebtRows.length > 0) {
      await tx.insert(debts).values(newDebtRows);
    }
  });

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
