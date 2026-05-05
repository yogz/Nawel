import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { user } from "@drizzle/schema";
import { outings } from "@drizzle/sortie-schema";
import { rateLimit } from "@/features/sortie/lib/rate-limit";
import { canonicalPathSegment } from "@/features/sortie/lib/parse-outing-path";
import { listFollowersToNotify } from "./queries";
import { signOptOutToken } from "./opt-out-token";

const SORTIE_BASE_URL = (process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr").replace(
  /\/$/,
  ""
);

/**
 * Envoie un email magic-link "nouvelle sortie" à chaque follower du
 * créateur. Pattern aligné sur `submitFollowEmailAction` (follow-gate) :
 * `auth.api.signInMagicLink` avec metadata dispatch dans le callback
 * `sendMagicLink` global de auth-config.ts (branche `outing-broadcast`).
 *
 * Idempotence : `outings.followers_broadcast_sent_at` est stampé via
 * UPDATE atomique avant l'envoi — un re-run ne réenvoie pas. La perte
 * d'un envoi en cours de batch est accepté (le J-1 reminder reprend la
 * relayance ; pas de retry inline pour rester simple).
 *
 * Rate limit côté créateur : 5 broadcasts / heure pour bloquer les abus
 * (compte spam-créant des sorties pour bombarder ses followers). Limite
 * confortable pour le cas légitime "j'ai 3 sorties d'avance à poser".
 *
 * Concurrence : Promise.all par chunks de 10 — Better Auth + Resend
 * tiennent sans saturer. Mode best-effort, les échecs individuels sont
 * loggés et n'interrompent pas le batch.
 *
 * `headersForAuth` est passé explicitement par le caller (la Server
 * Action `createOutingAction`) car ce code tourne dans `runAfterResponse`
 * et le contexte request `headers()` peut être indisponible. Ces
 * headers servent à Better Auth pour résoudre le `baseURL` (donc
 * l'origin Sortie) et déclencher la branche `fromSortie` du callback.
 */
export async function sendNewOutingBroadcast(args: {
  outingId: string;
  /** Headers de la Server Action originale, transmis pour conserver l'origin Sortie. */
  headersForAuth: Headers;
}): Promise<void> {
  const { outingId, headersForAuth } = args;

  try {
    // 1. Charge la sortie + le créateur. Skip si pas de creator user
    // (créateurs anon sans email → pas de followers à notifier de toute
    // façon, la table userFollows ne référence que des comptes).
    const outing = await db.query.outings.findFirst({
      where: eq(outings.id, outingId),
      columns: {
        id: true,
        title: true,
        slug: true,
        shortId: true,
        location: true,
        fixedDatetime: true,
        deadlineAt: true,
        status: true,
        creatorUserId: true,
        followersBroadcastSentAt: true,
      },
    });
    if (!outing) {
      return;
    }
    if (outing.status === "cancelled") {
      return;
    }
    if (!outing.creatorUserId) {
      return;
    }
    if (outing.followersBroadcastSentAt !== null) {
      // Déjà envoyé — short-circuit avant le rate-limit pour ne pas
      // pénaliser le compteur sur un re-trigger d'after().
      return;
    }

    // 2. Rate limit côté créateur. Le compteur est cohérent même si
    // plusieurs sorties parallèles tombent en même temps — Upstash
    // gère l'atomicité.
    const gate = await rateLimit({
      key: `broadcast:${outing.creatorUserId}`,
      limit: 5,
      windowSeconds: 3600,
    });
    if (!gate.ok) {
      console.warn(`[broadcast] rate-limited creator=${outing.creatorUserId} outing=${outingId}`);
      return;
    }

    // 3. UPDATE atomique : seul le 1er run pose le timestamp et continue.
    // Si un retry arrive (Vercel re-déclenche after, ou réinvocation),
    // l'UPDATE n'affecte 0 row et on early-return.
    const claim = await db
      .update(outings)
      .set({ followersBroadcastSentAt: new Date() })
      .where(and(eq(outings.id, outingId), isNull(outings.followersBroadcastSentAt)))
      .returning({ id: outings.id });
    if (claim.length === 0) {
      return;
    }

    // 4. Charge le nom du créateur (pour le subject + corps de l'email).
    // Borné à un single SELECT — pas la peine de compliquer la query
    // outings pour ça.
    const creator = await db.query.user.findFirst({
      where: eq(user.id, outing.creatorUserId),
      columns: { name: true },
    });
    const creatorName = creator?.name?.trim() || "Quelqu'un";

    // 5. Liste des followers à notifier (filtres dans la query).
    const recipients = await listFollowersToNotify(outing.creatorUserId);
    if (recipients.length === 0) {
      return;
    }

    const callbackURL = `${SORTIE_BASE_URL}/${canonicalPathSegment({
      slug: outing.slug,
      shortId: outing.shortId,
    })}?rsvp=auto`;

    // 6. Send par chunks de 10 (séquentiel entre chunks, parallel à
    // l'intérieur). Évite de submerger Better Auth (1 verification
    // créée par appel) et Resend (rate limit 10 req/sec par défaut).
    const CHUNK = 10;
    for (let i = 0; i < recipients.length; i += CHUNK) {
      const chunk = recipients.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (r) => {
          const unsubscribeUrl = `${SORTIE_BASE_URL}/sortie/unsubscribe?t=${encodeURIComponent(
            signOptOutToken(r.id)
          )}`;
          try {
            await auth.api.signInMagicLink({
              headers: headersForAuth,
              body: {
                email: r.email,
                callbackURL,
                metadata: {
                  source: "outing-broadcast",
                  outingTitle: outing.title,
                  creatorName,
                  startsAt: outing.fixedDatetime ? outing.fixedDatetime.toISOString() : null,
                  location: outing.location,
                  deadlineAt: outing.deadlineAt.toISOString(),
                  unsubscribeUrl,
                },
              },
            });
          } catch (err) {
            console.error(`[broadcast] failed for follower=${r.id} outing=${outingId}:`, err);
          }
        })
      );
    }
  } catch (err) {
    console.error(`[broadcast] unexpected error outing=${outingId}:`, err);
  }
}
