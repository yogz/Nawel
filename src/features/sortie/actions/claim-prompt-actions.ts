"use server";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { outings, participants } from "@drizzle/sortie-schema";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
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
 * email. On lui envoie un magic-link customisé via Better Auth ; aucune
 * écriture sur participants ici. La merge cookie→userId se fait à la
 * vérification du lien via le hook `databaseHooks.session.create.after`
 * dans `auth-config.ts` — preuve d'identité requise avant rattachement,
 * sinon n'importe qui pourrait s'attribuer les RSVPs d'un autre en
 * tapant son email.
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

  // Rows participant cookie-only de l'invité — utilisées uniquement pour
  // personnaliser l'email (anonName + outingIds). Pas de write ici : le
  // rattachement attend la verif du magic-link.
  const myRows = await db
    .select({
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

  // `signInMagicLink` crée le user automatiquement s'il n'existe pas
  // (Better Auth sign-up implicite, pas désactivé). `name: displayName`
  // alimente la row user à la création — sans ça, Better Auth retombe
  // sur la part locale de l'email. La metadata branche `sendMagicLink`
  // sur `metadata.source === "claim-prompt"` pour le template personnalisé.
  // Le callbackURL ramène l'invité sur la même page lien-privé, sans le
  // `?k=token` (on évite que le token fuite côté inbox).
  const callbackURL = `${SORTIE_BASE_URL}/@${creatorUsername}`;

  try {
    await auth.api.signInMagicLink({
      headers: await headers(),
      body: {
        email,
        name: displayName || undefined,
        callbackURL,
        metadata: {
          source: "claim-prompt",
          creatorName: creatorDisplay,
          outings: outingsForEmail,
        },
      },
    });
  } catch (err) {
    console.error("[claim-prompt] magic-link send failed:", err);
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
