/**
 * One-off (2026-10-28), asked by the owner: replace his phone-based Revolut
 * methods with his Revolut pseudo so debtors get the « Payer » button.
 *
 * Scope is pinned three ways: explicit row ids, type = revolut, and rows
 * owned by the owner's user id. Dry run by default; pass --apply to write.
 *
 *   npx tsx scripts/sortie/one-off-replace-owner-revolut.ts [--apply]
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { participants, purchaserPaymentMethods } from "@drizzle/sortie-schema";
import { canonicalPaymentValue } from "@/features/sortie/lib/payment-value";

const OWNER_USER_ID = "IvGnqiWcWzC6odd9QcGAhjWuKe2C5SB4";
const NEW_VALUE = "https://revolut.me/yogzgo";
const ROW_IDS = [
  "b377b894-7103-4b7a-b4e7-e950894531fc",
  "d01dd2de-db9b-4410-813a-32831496ae57",
  "c968148a-49f2-4635-86c7-e30760566c3d",
  "deefa128-b6a1-45d7-b299-21d7e3275598",
  "8e06cf56-98c5-4ae1-a62b-c9121a44114c",
  "45f64ca0-3c9d-4642-a88c-5f5270dfe839",
  "58959cc6-a5cf-4ce2-add8-6c409d63ac1b",
  "58989d3e-2305-445e-b62b-a5981e73a4d9",
  "d901b02b-d629-4f03-b1d1-af3c9d968d7a",
  "3dd67dfc-b551-48e5-a46f-5cbaaf035291",
  "b0b69a3b-47d8-4a13-a99d-333c7af1b85d",
  "8ca3904d-fa70-412c-a118-68e003f80f42",
];

async function main() {
  const apply = process.argv.includes("--apply");
  const value = canonicalPaymentValue("revolut", NEW_VALUE);
  if (!value.ok) {
    throw new Error(value.message);
  }

  const ownedParticipantIds = db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.userId, OWNER_USER_ID));
  const scope = and(
    inArray(purchaserPaymentMethods.id, ROW_IDS),
    eq(purchaserPaymentMethods.type, "revolut"),
    inArray(purchaserPaymentMethods.participantId, ownedParticipantIds)
  );

  const targets = await db
    .select({ id: purchaserPaymentMethods.id, preview: purchaserPaymentMethods.valuePreview })
    .from(purchaserPaymentMethods)
    .where(scope);
  console.log(`${targets.length}/${ROW_IDS.length} rows in scope → "${value.preview}"`);

  if (!apply) {
    console.log("Dry run — pass --apply to write.");
    return;
  }
  if (targets.length !== ROW_IDS.length) {
    throw new Error("Scope mismatch — nothing written.");
  }
  const updated = await db
    .update(purchaserPaymentMethods)
    .set({ valueEncrypted: encryptSecret(value.canonical), valuePreview: value.preview })
    .where(scope)
    .returning({ id: purchaserPaymentMethods.id });
  console.log(`Updated ${updated.length} rows.`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
