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

async function main() {
  const shortId = process.argv[2];
  if (!shortId) {
    console.error("usage: tsx scripts/db/inspect-purchase.ts <shortId>");
    process.exit(1);
  }

  const outing = await db.query.outings.findFirst({
    where: eq(outings.shortId, shortId),
  });
  if (!outing) {
    console.error(`Aucune sortie pour shortId=${shortId}`);
    process.exit(1);
  }

  console.log(`Outing : ${outing.title} (${outing.id}) status=${outing.status}`);

  const parts = await db
    .select({
      id: participants.id,
      anonName: participants.anonName,
      anonEmail: participants.anonEmail,
      response: participants.response,
      extraAdults: participants.extraAdults,
      extraChildren: participants.extraChildren,
      userId: participants.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(participants)
    .leftJoin(user, eq(participants.userId, user.id))
    .where(eq(participants.outingId, outing.id));

  console.log(`\nParticipants (${parts.length}) :`);
  parts.forEach((p) => {
    const name = p.userName ?? p.anonName ?? "(sans nom)";
    const email = p.userEmail ?? p.anonEmail ?? "(sans email)";
    console.log(
      `  - ${name.padEnd(20)} ${p.id} resp=${p.response} adultes=${p.extraAdults} enfants=${p.extraChildren} (${email})`
    );
  });

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
  });
  if (!purchase) {
    console.log("\nAucun achat enregistré.");
    process.exit(0);
  }

  const buyer = parts.find((p) => p.id === purchase.purchaserParticipantId);
  console.log(
    `\nAchat ${purchase.id} : payeur=${buyer?.userName ?? buyer?.anonName} (${purchase.purchaserParticipantId}) mode=${purchase.pricingMode} totalPlaces=${purchase.totalPlaces}`
  );
  console.log(
    `  unique=${purchase.uniquePriceCents} adulte=${purchase.adultPriceCents} enfant=${purchase.childPriceCents}`
  );

  const allocs = await db.query.purchaseAllocations.findMany({
    where: eq(purchaseAllocations.purchaseId, purchase.id),
  });
  console.log(`\nAllocations (${allocs.length}) :`);
  allocs.forEach((a) => {
    const p = parts.find((pp) => pp.id === a.participantId);
    console.log(
      `  - ${(p?.userName ?? p?.anonName ?? "?").padEnd(20)} child=${a.isChild} nominal=${a.nominalPriceCents ?? "-"}`
    );
  });

  const allDebts = await db.query.debts.findMany({
    where: eq(debts.outingId, outing.id),
  });
  console.log(`\nDettes (${allDebts.length}) :`);
  allDebts.forEach((d) => {
    const debtor = parts.find((p) => p.id === d.debtorParticipantId);
    const creditor = parts.find((p) => p.id === d.creditorParticipantId);
    console.log(
      `  - ${debtor?.userName ?? debtor?.anonName ?? "?"} doit ${(d.amountCents / 100).toFixed(2)}€ à ${creditor?.userName ?? creditor?.anonName ?? "?"} [status=${d.status}]`
    );
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
