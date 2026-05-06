import * as dotenv from "dotenv";
dotenv.config();

import { db } from "@/lib/db";
import { user, twoFactor } from "@drizzle/schema";
import { auditLog } from "@drizzle/sortie-schema";
import { eq } from "drizzle-orm";
import { ADMIN_AUDIT } from "@/features/sortie/lib/admin-audit-actions";

// Reset manuel de la 2FA d'un admin (téléphone perdu / seed compromis).
// Convention sécu : pas de canal email auto-recovery (vecteur social
// engineering). Reset = action manuelle effectuée par un autre admin
// via ce script, tracée dans `sortie.audit_log` (ADMIN_2FA_RESET).
//
// Usage: npx tsx scripts/admin/reset-2fa.ts <email> <actor-email>
//
//   <email>        : email du compte dont on remet la 2FA à zéro
//   <actor-email>  : email de l'admin qui exécute le reset (loggué)
//
// Effet : DELETE des rows two_factor + flip user.twoFactorEnabled=false.
// Le user devra re-enrôler une 2FA au prochain accès /admin (gate forcé).

async function resetTwoFactor() {
  const targetEmail = process.argv[2];
  const actorEmail = process.argv[3];

  if (!targetEmail || !actorEmail) {
    console.error("Usage: npx tsx scripts/admin/reset-2fa.ts <email> <actor-email>");
    process.exit(1);
  }

  const target = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, targetEmail),
  });
  if (!target) {
    console.error(`Aucun user trouvé pour ${targetEmail}`);
    process.exit(1);
  }

  const actor = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, actorEmail),
  });
  if (!actor) {
    console.error(`Aucun actor trouvé pour ${actorEmail}`);
    process.exit(1);
  }
  if (actor.role !== "admin") {
    console.error(`L'actor ${actorEmail} n'a pas le rôle admin — refusé.`);
    process.exit(1);
  }

  console.log(`Reset 2FA pour ${target.email} (id=${target.id}) par ${actor.email}…`);

  await db.transaction(async (tx) => {
    await tx.delete(twoFactor).where(eq(twoFactor.userId, target.id));
    await tx
      .update(user)
      .set({ twoFactorEnabled: false, updatedAt: new Date() })
      .where(eq(user.id, target.id));
    await tx.insert(auditLog).values({
      actorUserId: actor.id,
      action: ADMIN_AUDIT.ADMIN_2FA_RESET,
      payload: JSON.stringify({ targetUserId: target.id, targetEmail: target.email }),
    });
  });

  console.log(`OK. ${target.email} devra re-enrôler une 2FA au prochain accès /admin.`);
  process.exit(0);
}

resetTwoFactor().catch((err) => {
  console.error("Reset 2FA failed:", err);
  process.exit(1);
});
