/**
 * One-off (2026-10-28), asked by the owner in chat: put Revolut (default)
 * then Wero (backup) on his account (« Mon argent »), and add Revolut to
 * Pilote next to his existing Wero.
 *
 * The account rows skip the e-mail confirmation flow on purpose: the owner
 * requested them directly. Wero's ciphertext is copied as-is from his Pilote
 * row (never decrypted), like declarePurchaseAction copies account methods.
 * Idempotent; dry run by default, --apply to write.
 *
 *   npx tsx scripts/sortie/one-off-owner-account-methods.ts [--apply]
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { auditLog, purchaserPaymentMethods, userPaymentMethods } from "@drizzle/sortie-schema";
import { ACCOUNT_PAYMENT_AUDIT_ACTION } from "@/features/sortie/lib/audit";
import { canonicalPaymentValue } from "@/features/sortie/lib/payment-value";

const OWNER_USER_ID = "IvGnqiWcWzC6odd9QcGAhjWuKe2C5SB4";
const PILOTE_OUTING_ID = "ed2afac1-750d-4431-9a27-397971b118ed";
const PILOTE_OWNER_PARTICIPANT_ID = "afdf8d67-3ee3-46a1-aacb-5c9dee14d27d";
const PILOTE_WERO_METHOD_ID = "93551fa2-5128-464c-b8c4-9c64f9ab2b13";
const SOURCE = "owner-request-script-2026-10-28";

async function main() {
  const apply = process.argv.includes("--apply");
  const revolut = canonicalPaymentValue("revolut", "https://revolut.me/yogzgo");
  if (!revolut.ok) {
    throw new Error(revolut.message);
  }

  const wero = await db.query.purchaserPaymentMethods.findFirst({
    where: and(
      eq(purchaserPaymentMethods.id, PILOTE_WERO_METHOD_ID),
      eq(purchaserPaymentMethods.participantId, PILOTE_OWNER_PARTICIPANT_ID),
      eq(purchaserPaymentMethods.type, "wero")
    ),
  });
  if (!wero) {
    throw new Error("Source Wero row not found — nothing written.");
  }

  const account = await db
    .select({ type: userPaymentMethods.type, preview: userPaymentMethods.valuePreview })
    .from(userPaymentMethods)
    .where(eq(userPaymentMethods.userId, OWNER_USER_ID));
  const piloteMethods = await db
    .select({ type: purchaserPaymentMethods.type, preview: purchaserPaymentMethods.valuePreview })
    .from(purchaserPaymentMethods)
    .where(eq(purchaserPaymentMethods.participantId, PILOTE_OWNER_PARTICIPANT_ID));

  const has = (rows: { type: string; preview: string }[], type: string, preview: string) =>
    rows.some((r) => r.type === type && r.preview === preview);
  const addAccountRevolut = !has(account, "revolut", revolut.preview);
  const addAccountWero = !has(account, "wero", wero.valuePreview);
  const addPiloteRevolut = !has(piloteMethods, "revolut", revolut.preview);
  console.log({ addAccountRevolut, addAccountWero, addPiloteRevolut });

  if (!apply) {
    console.log("Dry run — pass --apply to write.");
    return;
  }

  // Revolut first, Wero one second later: account order = creation order,
  // and that order is what future purchases copy.
  const now = Date.now();
  await db.transaction(async (tx) => {
    const accountRows = [
      addAccountRevolut && {
        type: "revolut" as const,
        valueEncrypted: encryptSecret(revolut.canonical),
        valuePreview: revolut.preview,
        createdAt: new Date(now),
      },
      addAccountWero && {
        type: "wero" as const,
        valueEncrypted: wero.valueEncrypted,
        valuePreview: wero.valuePreview,
        createdAt: new Date(now + 1000),
      },
    ].filter((r) => r !== false);

    for (const row of accountRows) {
      const [inserted] = await tx
        .insert(userPaymentMethods)
        .values({ ...row, userId: OWNER_USER_ID, confirmedAt: new Date(now) })
        .returning({ id: userPaymentMethods.id });
      await tx.insert(auditLog).values({
        actorUserId: OWNER_USER_ID,
        action: ACCOUNT_PAYMENT_AUDIT_ACTION.USER_PAYMENT_METHOD_CONFIRMED,
        payload: JSON.stringify({
          methodId: inserted.id,
          type: row.type,
          valuePreview: row.valuePreview,
          source: SOURCE,
        }),
      });
    }

    if (addPiloteRevolut) {
      const [inserted] = await tx
        .insert(purchaserPaymentMethods)
        .values({
          participantId: PILOTE_OWNER_PARTICIPANT_ID,
          type: "revolut",
          valueEncrypted: encryptSecret(revolut.canonical),
          valuePreview: revolut.preview,
        })
        .returning({ id: purchaserPaymentMethods.id });
      await tx.insert(auditLog).values({
        outingId: PILOTE_OUTING_ID,
        actorParticipantId: PILOTE_OWNER_PARTICIPANT_ID,
        actorUserId: OWNER_USER_ID,
        action: "PAYMENT_METHOD_ADDED",
        payload: JSON.stringify({
          methodId: inserted.id,
          type: "revolut",
          valuePreview: revolut.preview,
          source: SOURCE,
        }),
      });
    }
  });
  console.log("Written.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
