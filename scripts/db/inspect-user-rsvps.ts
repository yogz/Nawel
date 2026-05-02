import * as dotenv from "dotenv";
dotenv.config();

import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { user } from "../../drizzle/schema";
import { outings, participants } from "../../drizzle/sortie-schema";

async function main() {
  const username = process.argv[2];
  const titleFragments = process.argv.slice(3);
  if (!username || titleFragments.length === 0) {
    console.error("Usage: tsx scripts/db/inspect-user-rsvps.ts <username> <title-fragment> [...]");
    process.exit(1);
  }

  const u = await db.query.user.findFirst({
    where: eq(user.username, username),
    columns: { id: true, name: true, email: true, username: true },
  });
  if (!u) {
    console.error(`User @${username} introuvable.`);
    process.exit(1);
  }
  console.log(`Cible : @${u.username} email=${u.email} id=${u.id}\n`);

  // Cookies connus de cet user.
  const partCookies = await db
    .selectDistinct({ hash: participants.cookieTokenHash })
    .from(participants)
    .where(eq(participants.userId, u.id));
  const outCookies = await db
    .selectDistinct({ hash: outings.creatorCookieTokenHash })
    .from(outings)
    .where(eq(outings.creatorUserId, u.id));
  const knownCookies = new Set<string>();
  for (const r of partCookies) {
    if (r.hash) knownCookies.add(r.hash);
  }
  for (const r of outCookies) {
    if (r.hash) knownCookies.add(r.hash);
  }
  console.log(`Cookies connus : ${knownCookies.size}\n`);

  // Sorties matchant les fragments de titre.
  const titleClause = or(...titleFragments.map((f) => ilike(outings.title, `%${f}%`)));
  const matched = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      title: outings.title,
      creatorUserId: outings.creatorUserId,
      creatorAnonName: outings.creatorAnonName,
      creatorAnonEmail: outings.creatorAnonEmail,
      creatorCookieTokenHash: outings.creatorCookieTokenHash,
    })
    .from(outings)
    .where(titleClause);

  if (matched.length === 0) {
    console.log("Aucune sortie matchée.");
    process.exit(0);
  }

  for (const o of matched) {
    console.log(`━━━ "${o.title}" (shortId=${o.shortId}, id=${o.id})`);
    console.log(
      `    creator: userId=${o.creatorUserId ?? "NULL"} anon="${o.creatorAnonName ?? ""}" email=${o.creatorAnonEmail ?? ""} cookieHash=${o.creatorCookieTokenHash ? o.creatorCookieTokenHash.slice(0, 12) + "…" : "NULL"}`
    );
    const isOurCreator = o.creatorUserId === u.id;
    const isOurCreatorViaCookie =
      o.creatorCookieTokenHash !== null && knownCookies.has(o.creatorCookieTokenHash);
    console.log(
      `    → creator-match-userId=${isOurCreator} creator-match-cookie=${isOurCreatorViaCookie}`
    );

    const parts = await db
      .select({
        id: participants.id,
        userId: participants.userId,
        anonName: participants.anonName,
        anonEmail: participants.anonEmail,
        cookieTokenHash: participants.cookieTokenHash,
        response: participants.response,
        respondedAt: participants.respondedAt,
        updatedAt: participants.updatedAt,
      })
      .from(participants)
      .where(eq(participants.outingId, o.id));

    console.log(`    participants (${parts.length}):`);
    for (const p of parts) {
      const matchUid = p.userId === u.id;
      const matchCookie = knownCookies.has(p.cookieTokenHash);
      const tag = matchUid ? "[USER]" : matchCookie ? "[COOKIE]" : "      ";
      console.log(
        `      ${tag} userId=${p.userId ?? "NULL"} anon="${p.anonName ?? ""}" cookieHash=${p.cookieTokenHash.slice(0, 12)}… response=${p.response} respondedAt=${p.respondedAt.toISOString().slice(0, 10)}`
      );
    }
    console.log();
  }

  // Vérification de listAllMyOutings : ces sorties matchent-elles le critère
  // "creator OU participant userId=u.id" ?
  console.log("━━━ Simulation listAllMyOutings (le critère utilisé par la home) :");
  const ids = matched.map((m) => m.id);
  const homeMatch = await db
    .select({ id: outings.id, title: outings.title })
    .from(outings)
    .where(
      and(
        inArray(outings.id, ids),
        or(
          eq(outings.creatorUserId, u.id),
          sql`${outings.id} IN (
            SELECT ${participants.outingId}
            FROM ${participants}
            WHERE ${participants.userId} = ${u.id}
              AND ${participants.response} IN ('yes','no','handle_own','interested')
          )`
        )
      )
    );
  console.log(`    matchées par la home : ${homeMatch.length}/${matched.length}`);
  for (const m of matched) {
    const inHome = homeMatch.some((h) => h.id === m.id);
    console.log(`    ${inHome ? "✓" : "✗"} ${m.title}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
