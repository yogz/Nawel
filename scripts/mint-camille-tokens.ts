import * as dotenv from "dotenv";
dotenv.config();

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { user } from "../drizzle/schema";

const TEST_USERNAME = "camille-test";

async function main() {
  const row = await db.query.user.findFirst({
    where: eq(user.username, TEST_USERNAME),
    columns: { id: true, calendarToken: true, rsvpInviteToken: true },
  });
  if (!row) {
    console.error(`User @${TEST_USERNAME} introuvable.`);
    process.exit(1);
  }

  const calendarToken = row.calendarToken ?? randomBytes(24).toString("base64url");
  const rsvpInviteToken = row.rsvpInviteToken ?? randomBytes(24).toString("base64url");

  await db
    .update(user)
    .set({ calendarToken, rsvpInviteToken, updatedAt: new Date() })
    .where(eq(user.id, row.id));

  const base = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";
  console.log(`User : @${TEST_USERNAME}`);
  console.log(`\nFlux iCal (à coller dans Google Calendar / Apple Calendar) :`);
  console.log(`  ${base}/sortie/calendar/${calendarToken}.ics`);
  console.log(`\nLien RSVP inline (profil avec ?k=…) :`);
  console.log(`  ${base}/@${TEST_USERNAME}?k=${rsvpInviteToken}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Mint failed:", err);
  process.exit(1);
});
