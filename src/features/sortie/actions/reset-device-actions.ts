"use server";

import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { outings, participants } from "@drizzle/sortie-schema";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { ensureSilentUserAccount } from "@/features/sortie/lib/silent-user";
import { getResetReclaimability } from "@/features/sortie/queries/reset-device-queries";
import type { FormActionState } from "./outing-actions";

const COOKIE_NAME = "sortie_pt";

const emailSchema = z.string().trim().toLowerCase().max(255).email("Email invalide.");
const nameSchema = z.string().trim().max(100);

/**
 * "Ce n'est pas moi" — réinitialise l'identité device d'un visiteur anon.
 *
 * Si l'utilisateur fournit un email avant le reset, ses RSVP et ses sorties
 * créées sont rattachés à un compte silent Better Auth pour qu'il puisse
 * les retrouver via magic-link plus tard. Sans email, le cookie est
 * simplement effacé — les rows en DB restent (l'organisateur les voit
 * toujours) mais deviennent inaccessibles depuis n'importe quel device.
 *
 * Le COALESCE sur les UPDATE garantit qu'on n'écrase jamais un email ou
 * userId déjà présent : si Alice a saisi alice@x.com sur la sortie A et
 * laisse le champ vide pour la sortie B (parce qu'elle pensait à autre
 * chose), un reset avec carole@x.com ne touche que B — alice@x.com
 * reste sur A.
 *
 * Blocage dur : si l'utilisateur est créateur d'une sortie active sans
 * email ni userId rattaché (et n'en saisit pas), on refuse le reset —
 * sinon il perdrait la gestion d'une sortie qu'il organise.
 */
export async function resetDeviceAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const cookieTokenHash = await readParticipantTokenHash();
  if (!cookieTokenHash) {
    return { message: "Aucun appareil à réinitialiser." };
  }

  // Le champ email est facultatif côté form ; on le valide seulement s'il
  // est non-vide pour ne pas forcer Zod à accepter `""` comme un email.
  const rawEmail = formData.get("email");
  const emailInput = typeof rawEmail === "string" ? rawEmail.trim() : "";
  let email: string | null = null;
  if (emailInput.length > 0) {
    const parsed = emailSchema.safeParse(emailInput);
    if (!parsed.success) {
      return { errors: { email: parsed.error.flatten().formErrors } };
    }
    email = parsed.data;
  }

  const rawName = formData.get("name");
  const nameInput = typeof rawName === "string" ? rawName.trim() : "";
  const nameParse = nameSchema.safeParse(nameInput);
  if (!nameParse.success) {
    return { errors: { name: nameParse.error.flatten().formErrors } };
  }
  const name = nameParse.data;

  const reclaim = await getResetReclaimability(cookieTokenHash);

  // Blocage dur : créateur d'une sortie active sans email rattaché et
  // qui ne saisit pas d'email maintenant. On n'efface pas le cookie —
  // la perte serait silencieuse et destructrice côté UX.
  if (reclaim.isCreatorWithoutEmail && !email && !reclaim.hasReclaimableEmail) {
    return {
      message:
        "Tu gères une sortie en cours. Donne-toi un email avant de réinitialiser, sinon tu perdras la main dessus.",
    };
  }

  if (email) {
    const silentUserId = await ensureSilentUserAccount({
      email,
      name: name || reclaim.anonName || "",
    });

    await db.transaction(async (tx) => {
      // Rattachement participants — COALESCE pour ne jamais écraser un
      // email/userId déjà saisis sur d'autres sorties.
      await tx
        .update(participants)
        .set({
          anonEmail: sql`COALESCE(${participants.anonEmail}, ${email})`,
          ...(silentUserId
            ? { userId: sql`COALESCE(${participants.userId}, ${silentUserId})` }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(participants.cookieTokenHash, cookieTokenHash));

      // Rattachement outings créées — pareil.
      await tx
        .update(outings)
        .set({
          creatorAnonEmail: sql`COALESCE(${outings.creatorAnonEmail}, ${email})`,
          ...(silentUserId
            ? { creatorUserId: sql`COALESCE(${outings.creatorUserId}, ${silentUserId})` }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(outings.creatorCookieTokenHash, cookieTokenHash));
    });
  }

  // Suppression du cookie hors transaction. Au prochain hit,
  // `ensureParticipantTokenHash` régénère un cookie vierge — l'identité
  // device repart à zéro tandis que les rows existantes restent en DB.
  const store = await cookies();
  store.delete(COOKIE_NAME);

  revalidatePath("/");

  return {};
}
