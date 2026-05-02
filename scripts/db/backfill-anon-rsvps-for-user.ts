/**
 * Rattache à un user existant ses rows `participants` et `outings`
 * créées en mode anon (avant qu'il ait un compte / sur un autre device
 * sans login). Symptôme typique : sur sa home il ne se voit pas
 * "présent" alors que les pages détail lui montrent bien sa réponse —
 * la home matche par `userId`, la page détail matche aussi par
 * `cookieTokenHash`.
 *
 * Usage :
 *   tsx scripts/db/backfill-anon-rsvps-for-user.ts <username>           # dry-run
 *   tsx scripts/db/backfill-anon-rsvps-for-user.ts <username> --apply   # write
 *   tsx scripts/db/backfill-anon-rsvps-for-user.ts <username> --apply --match-by-email --match-by-anon-name
 *
 * Stratégie de matching, du plus sûr au plus large (s'additionnent) :
 *   1. Cookies déjà attestés : `participants.cookie_token_hash` où
 *      `user_id = <user>` ou `outings.creator_cookie_token_hash` où
 *      `creator_user_id = <user>`. Tout cookie qu'on a vu lié au user
 *      au moins une fois est fiable.
 *   2. (--match-by-email) Rows anon où `anon_email` = email du user.
 *   3. (--match-by-anon-name) Rows anon où `anon_name` ILIKE le
 *      username ou le `name` du user. Heuristique — à utiliser quand
 *      l'user a saisi son pseudo comme display name lors d'un RSVP
 *      anon depuis un autre device.
 *
 * Le script n'invente jamais un userId : il ne backfill que des rows
 * où `user_id` (ou `creator_user_id`) est `NULL`.
 */
import * as dotenv from "dotenv";
dotenv.config();

import { and, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { user } from "../../drizzle/schema";
import { outings, participants } from "../../drizzle/sortie-schema";

async function main() {
  const args = process.argv.slice(2);
  const username = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");
  const matchByEmail = args.includes("--match-by-email");
  const matchByAnonName = args.includes("--match-by-anon-name");

  if (!username) {
    console.error(
      "Usage: tsx scripts/db/backfill-anon-rsvps-for-user.ts <username> [--apply] [--match-by-email] [--match-by-anon-name]"
    );
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
  console.log(`Cible : @${u.username} (${u.email}) id=${u.id}`);

  // Cookies attestés : déjà liés au user au moins une fois quelque part.
  // Constituent le critère #1 (toujours appliqué).
  const partCookieRows = await db
    .selectDistinct({ hash: participants.cookieTokenHash })
    .from(participants)
    .where(eq(participants.userId, u.id));
  const outCookieRows = await db
    .selectDistinct({ hash: outings.creatorCookieTokenHash })
    .from(outings)
    .where(eq(outings.creatorUserId, u.id));
  const trustedCookies = new Set<string>();
  for (const r of partCookieRows) {
    if (r.hash) {
      trustedCookies.add(r.hash);
    }
  }
  for (const r of outCookieRows) {
    if (r.hash) {
      trustedCookies.add(r.hash);
    }
  }
  console.log(`Cookies attestés : ${trustedCookies.size}`);

  const cookieList = [...trustedCookies];

  // On agrège les rows à rattacher dans des Map<id, row> pour dédupliquer
  // entre critères. Chaque row est listée une fois quel que soit le
  // nombre de critères qui la matchent.
  const partsToFix = new Map<
    string,
    { outingId: string; anonName: string | null; response: string; matchedBy: string[] }
  >();
  const outingsToFix = new Map<
    string,
    { shortId: string; title: string; creatorAnonName: string | null; matchedBy: string[] }
  >();

  function addPart(
    row: { id: string; outingId: string; anonName: string | null; response: string },
    matchedBy: string
  ) {
    const existing = partsToFix.get(row.id);
    if (existing) {
      existing.matchedBy.push(matchedBy);
    } else {
      partsToFix.set(row.id, {
        outingId: row.outingId,
        anonName: row.anonName,
        response: row.response,
        matchedBy: [matchedBy],
      });
    }
  }
  function addOuting(
    row: { id: string; shortId: string; title: string; creatorAnonName: string | null },
    matchedBy: string
  ) {
    const existing = outingsToFix.get(row.id);
    if (existing) {
      existing.matchedBy.push(matchedBy);
    } else {
      outingsToFix.set(row.id, {
        shortId: row.shortId,
        title: row.title,
        creatorAnonName: row.creatorAnonName,
        matchedBy: [matchedBy],
      });
    }
  }

  // Critère 1 : cookie attesté.
  if (cookieList.length > 0) {
    const rows = await db
      .select({
        id: participants.id,
        outingId: participants.outingId,
        anonName: participants.anonName,
        response: participants.response,
      })
      .from(participants)
      .where(and(isNull(participants.userId), inArray(participants.cookieTokenHash, cookieList)));
    for (const r of rows) {
      addPart(r, "cookie");
    }

    const oRows = await db
      .select({
        id: outings.id,
        shortId: outings.shortId,
        title: outings.title,
        creatorAnonName: outings.creatorAnonName,
      })
      .from(outings)
      .where(
        and(isNull(outings.creatorUserId), inArray(outings.creatorCookieTokenHash, cookieList))
      );
    for (const r of oRows) {
      addOuting(r, "cookie");
    }
  }

  // Critère 2 : email exact.
  if (matchByEmail) {
    const rows = await db
      .select({
        id: participants.id,
        outingId: participants.outingId,
        anonName: participants.anonName,
        response: participants.response,
      })
      .from(participants)
      .where(and(isNull(participants.userId), eq(participants.anonEmail, u.email)));
    for (const r of rows) {
      addPart(r, "email");
    }

    const oRows = await db
      .select({
        id: outings.id,
        shortId: outings.shortId,
        title: outings.title,
        creatorAnonName: outings.creatorAnonName,
      })
      .from(outings)
      .where(and(isNull(outings.creatorUserId), eq(outings.creatorAnonEmail, u.email)));
    for (const r of oRows) {
      addOuting(r, "email");
    }
  }

  // Critère 3 : anon_name = username ou name (case-insensitive).
  if (matchByAnonName) {
    const nameClauses = [ilike(participants.anonName, u.username ?? "")];
    if (u.name) {
      nameClauses.push(ilike(participants.anonName, u.name));
    }
    const rows = await db
      .select({
        id: participants.id,
        outingId: participants.outingId,
        anonName: participants.anonName,
        response: participants.response,
      })
      .from(participants)
      .where(and(isNull(participants.userId), or(...nameClauses)!));
    for (const r of rows) {
      addPart(r, "anon-name");
    }

    const outingNameClauses = [ilike(outings.creatorAnonName, u.username ?? "")];
    if (u.name) {
      outingNameClauses.push(ilike(outings.creatorAnonName, u.name));
    }
    const oRows = await db
      .select({
        id: outings.id,
        shortId: outings.shortId,
        title: outings.title,
        creatorAnonName: outings.creatorAnonName,
      })
      .from(outings)
      .where(and(isNull(outings.creatorUserId), or(...outingNameClauses)!));
    for (const r of oRows) {
      addOuting(r, "anon-name");
    }
  }

  console.log(`\nParticipants à rattacher : ${partsToFix.size}`);
  let count = 0;
  for (const [id, p] of partsToFix) {
    if (count++ >= 50) {
      break;
    }
    console.log(
      `  - participant=${id} outing=${p.outingId} response=${p.response} anon="${p.anonName ?? ""}" via=${p.matchedBy.join(",")}`
    );
  }
  if (partsToFix.size > 50) {
    console.log(`  … (+${partsToFix.size - 50})`);
  }

  console.log(`\nOutings (créateur) à rattacher : ${outingsToFix.size}`);
  count = 0;
  for (const [, o] of outingsToFix) {
    if (count++ >= 50) {
      break;
    }
    console.log(
      `  - outing=${o.shortId} "${o.title}" anon="${o.creatorAnonName ?? ""}" via=${o.matchedBy.join(",")}`
    );
  }
  if (outingsToFix.size > 50) {
    console.log(`  … (+${outingsToFix.size - 50})`);
  }

  if (!apply) {
    console.log("\n[dry-run] Relancer avec --apply pour écrire.");
    process.exit(0);
  }

  if (partsToFix.size === 0 && outingsToFix.size === 0) {
    console.log("Rien à faire.");
    process.exit(0);
  }

  const partIds = [...partsToFix.keys()];
  const outingIds = [...outingsToFix.keys()];

  await db.transaction(async (tx) => {
    const now = new Date();
    if (partIds.length > 0) {
      const res = await tx
        .update(participants)
        .set({
          userId: u.id,
          // anonName/anonEmail nettoyés pour éviter la double identité
          // (cohérent avec ce que fait participant-actions au write).
          anonName: null,
          anonEmail: null,
          updatedAt: now,
        })
        .where(and(isNull(participants.userId), inArray(participants.id, partIds)))
        .returning({ id: participants.id });
      console.log(`participants mis à jour : ${res.length}`);
    }
    if (outingIds.length > 0) {
      const res = await tx
        .update(outings)
        .set({
          creatorUserId: u.id,
          creatorAnonName: null,
          creatorAnonEmail: null,
          // creatorCookieTokenHash conservé : utile pour reconnaître le
          // device d'origine. (outing-actions le met à null à la création
          // si l'user était déjà loggé ; ici on simule un claim après-coup.)
          updatedAt: now,
        })
        .where(and(isNull(outings.creatorUserId), inArray(outings.id, outingIds)))
        .returning({ id: outings.id });
      console.log(`outings mises à jour : ${res.length}`);
    }
  });

  console.log("\nFait. La home devrait maintenant afficher correctement les RSVP de cet user.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
