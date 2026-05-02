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
 *   tsx scripts/db/backfill-anon-rsvps-for-user.ts <username> --apply --match-by-email
 *
 * Stratégie de matching, du plus sûr au plus large :
 *   1. Cookies déjà attestés : `participants.cookie_token_hash` où
 *      `user_id = <user>` ou `outings.creator_cookie_token_hash` où
 *      `creator_user_id = <user>`. Tout cookie qu'on a vu lié au user
 *      au moins une fois est fiable.
 *   2. (--match-by-email) Cookies présents sur des rows anon dont
 *      l'`anon_email` = email du user. Élargit à des sorties créées
 *      avant tout login mais avec son email.
 *
 * Le script n'invente jamais un userId : il ne backfill que des rows
 * où `user_id` (ou `creator_user_id`) est `NULL`.
 */
import * as dotenv from "dotenv";
dotenv.config();

import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { user } from "../../drizzle/schema";
import { outings, participants } from "../../drizzle/sortie-schema";

async function main() {
  const args = process.argv.slice(2);
  const username = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");
  const matchByEmail = args.includes("--match-by-email");

  if (!username) {
    console.error(
      "Usage: tsx scripts/db/backfill-anon-rsvps-for-user.ts <username> [--apply] [--match-by-email]"
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

  // 1) Cookies attestés : déjà liés au user au moins une fois quelque part.
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

  // 2) Optionnel : cookies déduits via email sur rows anon.
  if (matchByEmail) {
    const partByEmail = await db
      .selectDistinct({ hash: participants.cookieTokenHash })
      .from(participants)
      .where(and(isNull(participants.userId), eq(participants.anonEmail, u.email)));
    const outByEmail = await db
      .selectDistinct({ hash: outings.creatorCookieTokenHash })
      .from(outings)
      .where(and(isNull(outings.creatorUserId), eq(outings.creatorAnonEmail, u.email)));
    let added = 0;
    for (const r of partByEmail) {
      if (r.hash && !trustedCookies.has(r.hash)) {
        trustedCookies.add(r.hash);
        added++;
      }
    }
    for (const r of outByEmail) {
      if (r.hash && !trustedCookies.has(r.hash)) {
        trustedCookies.add(r.hash);
        added++;
      }
    }
    console.log(`Cookies ajoutés via email : ${added}`);
  }

  if (trustedCookies.size === 0) {
    console.log("Aucun cookie à rattacher — rien à faire.");
    process.exit(0);
  }

  const cookieList = [...trustedCookies];

  // Inventaire avant modif.
  const orphanParts = await db
    .select({
      id: participants.id,
      outingId: participants.outingId,
      anonName: participants.anonName,
      response: participants.response,
    })
    .from(participants)
    .where(and(isNull(participants.userId), inArray(participants.cookieTokenHash, cookieList)));

  const orphanOutings = await db
    .select({
      id: outings.id,
      shortId: outings.shortId,
      title: outings.title,
      creatorAnonName: outings.creatorAnonName,
    })
    .from(outings)
    .where(and(isNull(outings.creatorUserId), inArray(outings.creatorCookieTokenHash, cookieList)));

  console.log(`\nParticipants à rattacher : ${orphanParts.length}`);
  for (const p of orphanParts.slice(0, 50)) {
    console.log(
      `  - participant=${p.id} outing=${p.outingId} response=${p.response} anon="${p.anonName ?? ""}"`
    );
  }
  if (orphanParts.length > 50) {
    console.log(`  … (+${orphanParts.length - 50})`);
  }

  console.log(`\nOutings (créateur) à rattacher : ${orphanOutings.length}`);
  for (const o of orphanOutings.slice(0, 50)) {
    console.log(`  - outing=${o.shortId} "${o.title}" anon="${o.creatorAnonName ?? ""}"`);
  }
  if (orphanOutings.length > 50) {
    console.log(`  … (+${orphanOutings.length - 50})`);
  }

  if (!apply) {
    console.log("\n[dry-run] Relancer avec --apply pour écrire.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    const now = new Date();
    if (orphanParts.length > 0) {
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
        .where(and(isNull(participants.userId), inArray(participants.cookieTokenHash, cookieList)))
        .returning({ id: participants.id });
      console.log(`participants mis à jour : ${res.length}`);
    }
    if (orphanOutings.length > 0) {
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
        .where(
          and(isNull(outings.creatorUserId), inArray(outings.creatorCookieTokenHash, cookieList))
        )
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
