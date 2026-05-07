import * as dotenv from "dotenv";
dotenv.config();
import { eq, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { outings, auditLog } from "../../drizzle/sortie-schema";
import { user } from "../../drizzle/schema";

// Force le status d'une sortie de `open` (ou `awaiting_purchase`) vers
// `purchased`, sans créer de purchase row. Pour les cas "billets pris
// hors-app, je ne veux pas remplir le formulaire d'achat, juste figer
// l'état". Bumpe `sequence` pour signaler le changement aux abonnés iCal
// (RFC 5545 §3.8.7.4).
//
// Usage:
//   npx tsx scripts/db/mark-outing-purchased.ts <shortId> <actor-email>          (dry-run)
//   npx tsx scripts/db/mark-outing-purchased.ts <shortId> <actor-email> --apply  (exécute)

async function main() {
  const shortId = process.argv[2];
  const actorEmail = process.argv[3];
  const apply = process.argv.includes("--apply");
  if (!shortId || !actorEmail) {
    console.error(
      "Usage: npx tsx scripts/db/mark-outing-purchased.ts <shortId> <actor-email> [--apply]"
    );
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
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    console.error(`Outing ${shortId} introuvable.`);
    process.exit(1);
  }
  if (outing.status === "purchased") {
    console.error(`Outing déjà en status=purchased.`);
    process.exit(1);
  }
  if (outing.status === "cancelled" || outing.status === "settled") {
    console.error(`Refus : status=${outing.status}, transition non autorisée.`);
    process.exit(1);
  }

  console.log(`\nOuting   : ${outing.title} (${outing.shortId})`);
  console.log(`Status   : ${outing.status} → purchased`);
  console.log(`Sequence : ${outing.sequence} → ${outing.sequence + 1}  (iCal bump)`);

  if (!apply) {
    console.log("\n[dry-run] Relance avec --apply pour exécuter.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(outings)
      .set({
        status: "purchased",
        updatedAt: new Date(),
        sequence: sql`${outings.sequence} + 1`,
      })
      .where(eq(outings.id, outing.id));
    await tx.insert(auditLog).values({
      actorUserId: actor.id,
      outingId: outing.id,
      action: "OUTING_ADMIN_FORCED_PURCHASED",
      payload: JSON.stringify({
        previousStatus: outing.status,
        reason: "Manual mark — billets pris hors-app, pas de purchase row associé",
      }),
    });
  });

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
