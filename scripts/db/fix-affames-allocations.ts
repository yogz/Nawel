import * as dotenv from "dotenv";
dotenv.config();
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  outings,
  participants,
  purchases,
  purchaseAllocations,
  debts,
  auditLog,
} from "../../drizzle/sortie-schema";
import { user } from "../../drizzle/schema";

// Fix one-shot pour la sortie « Les affamés » (shortId=dfqNJ5KX) :
//
// État actuel :
//   - Achat Nicolas, totalPlaces=3, allocations [Nicolas 49€, Yves 39€, vagoguma 49€]
//   - 0 dettes (anormal, probablement supprimées via admin tooling)
//
// État cible :
//   - Achat Nicolas, totalPlaces=2, allocations [Nicolas 49€, vagoguma 49€]
//   - Dette vagoguma → Nicolas : 49€
//   - Yves retiré de l'achat (gère sa place lui-même)
//   - Laurent reste hors achat (jamais alloué)
//
// Usage:
//   npx tsx scripts/db/fix-affames-allocations.ts <actor-email>          (dry-run)
//   npx tsx scripts/db/fix-affames-allocations.ts <actor-email> --apply  (exécute)

const SHORT_ID = "dfqNJ5KX";
const YVES_EMAIL = "yvesanslert@yahoo.fr";
const VAGOGUMA_EMAIL = "vagoguma@gmail.com";
const NICOLAS_EMAIL = "nicolas.a.perez@gmail.com";
const VAGOGUMA_DEBT_CENTS = 4900;

async function main() {
  const actorEmail = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!actorEmail) {
    console.error("Usage: npx tsx scripts/db/fix-affames-allocations.ts <actor-email> [--apply]");
    process.exit(1);
  }

  const actor = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${actorEmail.toLowerCase()}`,
  });
  if (!actor || actor.role !== "admin") {
    console.error(`Actor ${actorEmail} introuvable ou non-admin.`);
    process.exit(1);
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, SHORT_ID),
  });
  if (!outing) {
    console.error(`Outing ${SHORT_ID} introuvable.`);
    process.exit(1);
  }

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (!purchase) {
    console.error("Aucun achat sur cette sortie.");
    process.exit(1);
  }

  const parts = await db
    .select({
      id: participants.id,
      userId: participants.userId,
      email: user.email,
      name: user.name,
    })
    .from(participants)
    .leftJoin(user, eq(participants.userId, user.id))
    .where(eq(participants.outingId, outing.id));

  const yves = parts.find((p) => p.email?.toLowerCase() === YVES_EMAIL);
  const vagoguma = parts.find((p) => p.email?.toLowerCase() === VAGOGUMA_EMAIL);
  const nicolas = parts.find((p) => p.email?.toLowerCase() === NICOLAS_EMAIL);
  if (!yves || !vagoguma || !nicolas) {
    console.error("Manque un participant (Yves/vagoguma/Nicolas).");
    process.exit(1);
  }
  if (purchase.purchaserParticipantId !== nicolas.id) {
    console.error(
      `Refus : l'acheteur courant n'est pas Nicolas (${purchase.purchaserParticipantId}). Vérifier l'état avant de re-tenter.`
    );
    process.exit(1);
  }

  const yvesAlloc = await db.query.purchaseAllocations.findFirst({
    where: and(
      eq(purchaseAllocations.purchaseId, purchase.id),
      eq(purchaseAllocations.participantId, yves.id)
    ),
  });
  if (!yvesAlloc) {
    console.error("Pas d'allocation Yves à supprimer — état déjà bon ? Inspect d'abord.");
    process.exit(1);
  }

  const existingDebt = await db.query.debts.findFirst({
    where: and(
      eq(debts.outingId, outing.id),
      eq(debts.debtorParticipantId, vagoguma.id),
      eq(debts.creditorParticipantId, nicolas.id)
    ),
  });

  console.log(`\nOuting   : ${outing.title} (${outing.shortId})`);
  console.log(`Acheteur : Nicolas`);
  console.log(`\nActions :`);
  console.log(`  - DELETE allocation Yves (id=${yvesAlloc.id}, ${yvesAlloc.nominalPriceCents}c)`);
  console.log(
    `  - UPDATE purchases.totalPlaces ${purchase.totalPlaces} → ${purchase.totalPlaces - 1}`
  );
  if (existingDebt) {
    console.log(
      `  - SKIP dette vagoguma→Nicolas (existe déjà id=${existingDebt.id} amount=${existingDebt.amountCents}c status=${existingDebt.status})`
    );
  } else {
    console.log(`  - INSERT dette vagoguma→Nicolas : ${VAGOGUMA_DEBT_CENTS}c`);
  }
  console.log(`  - INSERT audit_log: OUTING_ADMIN_ALLOCATION_REMOVED + DEBT_ADMIN_RESTORED`);

  if (!apply) {
    console.log("\n[dry-run] Relance avec --apply pour exécuter.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    await tx.delete(purchaseAllocations).where(eq(purchaseAllocations.id, yvesAlloc.id));
    await tx
      .update(purchases)
      .set({ totalPlaces: purchase.totalPlaces - 1 })
      .where(eq(purchases.id, purchase.id));
    if (!existingDebt) {
      await tx.insert(debts).values({
        outingId: outing.id,
        debtorParticipantId: vagoguma.id,
        creditorParticipantId: nicolas.id,
        amountCents: VAGOGUMA_DEBT_CENTS,
      });
    }
    await tx.insert(auditLog).values({
      actorUserId: actor.id,
      outingId: outing.id,
      action: "OUTING_ADMIN_ALLOCATION_REMOVED",
      payload: JSON.stringify({
        purchaseId: purchase.id,
        removedAllocationId: yvesAlloc.id,
        removedParticipantId: yves.id,
        removedNominalCents: yvesAlloc.nominalPriceCents,
        reason: "Yves a pris sa place lui-même",
      }),
    });
    if (!existingDebt) {
      await tx.insert(auditLog).values({
        actorUserId: actor.id,
        outingId: outing.id,
        action: "DEBT_ADMIN_RESTORED",
        payload: JSON.stringify({
          debtorParticipantId: vagoguma.id,
          creditorParticipantId: nicolas.id,
          amountCents: VAGOGUMA_DEBT_CENTS,
          reason: "Restauration manuelle après cleanup allocations",
        }),
      });
    }
  });

  console.log("\nDone. Re-inspect : npx tsx scripts/db/inspect-purchase.ts dfqNJ5KX");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
