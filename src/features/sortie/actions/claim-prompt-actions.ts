"use server";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { outings, participants } from "@drizzle/sortie-schema";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { ensureSilentUserAccount } from "@/features/sortie/lib/silent-user";
import { formatOutingDateShort } from "@/features/sortie/lib/date-fr";
import { formDataToObject } from "@/features/sortie/lib/form-data";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import {
  CLAIM_PROMPT_DISMISS_COOKIE,
  CLAIM_PROMPT_DISMISS_TTL_SECONDS,
} from "@/features/sortie/lib/claim-prompt";
import { claimPromptEmailSchema } from "./schemas";
import type { FormActionState } from "./outing-actions";

const SORTIE_BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(
  /\/$/,
  ""
);

/**
 * Invité non-loggé qui a RSVP à ≥2 sorties d'un organisateur donne son
 * email. On crée un silent user account, on rattache toutes ses rows
 * participant cookie-only à ce userId (cross-device travel sans relog),
 * puis on lui envoie un magic-link customisé via Better Auth (cf.
 * sendMagicLink dans auth-config qui branche selon metadata.source).
 */
export async function submitEmailClaimAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = claimPromptEmailSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { email, creatorUsername } = parsed.data;

  const cookieTokenHash = await readParticipantTokenHash();
  if (!cookieTokenHash) {
    // Sans cookie identity, aucune row à merger — la prompt n'aurait
    // jamais dû s'afficher. Silencieux côté UX, pas un vrai cas d'erreur.
    return { message: "Réponse RSVP introuvable depuis ce navigateur." };
  }

  const gate = await rateLimit({
    key: `claim-email:${email.toLowerCase()}`,
    limit: 3,
    windowSeconds: 900,
  });
  if (!gate.ok) {
    return { message: gate.message };
  }

  // Récupère les rows participant existantes pour cet invité (par cookie)
  // ET qui n'ont pas déjà un userId — les autres ont déjà été claimées.
  // On a besoin du anonName pour ensureSilentUserAccount, et des outingIds
  // pour résoudre les sorties à lister dans l'email.
  const myRows = await db
    .select({
      id: participants.id,
      outingId: participants.outingId,
      anonName: participants.anonName,
    })
    .from(participants)
    .where(and(eq(participants.cookieTokenHash, cookieTokenHash), isNull(participants.userId)));

  if (myRows.length === 0) {
    return { message: "Pas de réponse à associer." };
  }

  const displayName =
    myRows.find((r) => r.anonName !== null && r.anonName.trim() !== "")?.anonName ?? "";

  const silentUserId = await ensureSilentUserAccount({ email, name: displayName });
  if (!silentUserId) {
    return { message: "Cet email ne peut pas être utilisé." };
  }

  // Bulk merge : on rattache toutes les rows cookie-only au silent user.
  // anonEmail mis à null pour aligner sur la convention rsvpAction (quand
  // userId est set, l'identité est dans la table user, pas dupliquée).
  await db
    .update(participants)
    .set({ userId: silentUserId, anonEmail: null, updatedAt: new Date() })
    .where(and(eq(participants.cookieTokenHash, cookieTokenHash), isNull(participants.userId)));

  // Récupère les sorties pour personnaliser l'email — titre + date courte,
  // 5 max pour ne pas faire un mail-mur. Tri par startsAt asc (les plus
  // proches d'abord), null en dernier (sondage non tranché).
  const outingIds = myRows.map((r) => r.outingId);
  const outingRows = await db
    .select({
      id: outings.id,
      title: outings.title,
      startsAt: outings.fixedDatetime,
    })
    .from(outings)
    .where(inArray(outings.id, outingIds))
    .orderBy(asc(sql`coalesce(${outings.fixedDatetime}, '9999-12-31'::timestamptz)`))
    .limit(5);

  const outingsForEmail = outingRows.map((o) => ({
    title: o.title,
    dateStr: o.startsAt ? formatOutingDateShort(o.startsAt) : null,
  }));

  // Nom du créateur récupéré via username (route param). On préfère le
  // display name de la row user si dispo, sinon fallback sur l'username
  // dans l'email.
  const creatorRow = await db.query.user.findFirst({
    where: sql`lower(${user.username}) = ${creatorUsername.toLowerCase()}`,
    columns: { name: true, username: true },
  });
  const creatorDisplay = creatorRow?.name?.trim() || creatorRow?.username || creatorUsername;

  // Magic-link Better Auth — `auth.api.signInMagicLink` est le pendant
  // server-side de `authClient.signIn.magicLink`. La metadata est
  // forwardée au callback `sendMagicLink` qui branche sur
  // `metadata.source === "claim-prompt"` pour utiliser le template
  // personnalisé (cf. auth-config.ts).
  // Le callbackURL ramène l'invité sur la même page lien-privé, mais
  // sans le `?k=token` (on perd le token au passage par l'email pour
  // pas qu'il fuite côté inbox). Il sera re-loggué via session, donc
  // showRsvp passera par session.user au lieu du token.
  const callbackURL = `${SORTIE_BASE_URL}/@${creatorUsername}`;

  try {
    await auth.api.signInMagicLink({
      headers: await headers(),
      body: {
        email,
        callbackURL,
        // Better Auth typage flou sur metadata — cast en `unknown` pour
        // contourner sans relâcher le type des fields utilisés.
        metadata: {
          source: "claim-prompt",
          creatorName: creatorDisplay,
          outings: outingsForEmail,
        },
      },
    });
  } catch (err) {
    console.error("[claim-prompt] magic-link send failed:", err);
    // Bulk update déjà passé : on ne le défait pas (next signin manuel
    // récupère quand même les rows). Juste, l'email n'est pas parti.
    return { message: "Lien introuvable — réessaie dans un instant." };
  }

  return { message: "Lien envoyé. Vérifie ta boîte." };
}

/**
 * Pose un cookie 30j qui supprime l'affichage de la prompt côté server
 * render. Path `/` pour qu'il s'applique à toutes les routes — la
 * prompt ne vit qu'en lien-privé aujourd'hui mais autant éviter
 * d'avoir à re-poser le cookie si on l'étend ailleurs.
 */
export async function dismissClaimPromptAction(): Promise<void> {
  const store = await cookies();
  store.set(CLAIM_PROMPT_DISMISS_COOKIE, "1", {
    maxAge: CLAIM_PROMPT_DISMISS_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    httpOnly: false, // lecture côté client utile pour cacher l'UI sans round-trip
    secure: process.env.NODE_ENV === "production",
  });
}
