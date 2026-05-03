import { and, eq, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { participants } from "@drizzle/sortie-schema";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { readParticipantTokenHash } from "@/features/sortie/lib/cookie-token";
import { getMyParticipant, getOutingByShortId } from "@/features/sortie/queries/outing-queries";

type Outing = NonNullable<Awaited<ReturnType<typeof getOutingByShortId>>>;
type Participant = typeof participants.$inferSelect;

export type ParticipantSubPath = "dettes" | "achat" | "paiement";

/**
 * Discriminated union des états possibles quand on charge une page
 * privée-participant. Le caller s'aiguille via `kind` :
 *   - `ok` : tout va bien, rendre la page normale
 *   - `needs-auth` : afficher le gate magic link
 *   - `not-participant` : user connecté mais pas dans la sortie → notice
 *   - `redirect` : path canonique différent → redirect
 *   - `not-found` : outing inconnu ou slugOrId invalide
 */
export type ParticipantPageState =
  | { kind: "ok"; outing: Outing; me: Participant; canonical: string }
  | {
      kind: "needs-auth";
      outing: Outing;
      canonical: string;
      prefillEmail: string | null;
    }
  | { kind: "not-participant"; outing: Outing; canonical: string; userEmail: string }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" };

/**
 * Centralise le gating des pages privées d'une sortie (`/dettes`,
 * `/achat`, `/paiement`). Évite la duplication du même bloc auth +
 * lookup participant + 404 silencieux dans chaque page.
 *
 * Le `subPath` n'est utilisé que pour construire l'URL de redirect
 * canonique — la logique de gating elle-même est uniforme.
 */
export async function loadParticipantPage(
  slugOrId: string,
  subPath: ParticipantSubPath
): Promise<ParticipantPageState> {
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    return { kind: "not-found" };
  }

  const outing = await getOutingByShortId(shortId);
  if (!outing) {
    return { kind: "not-found" };
  }

  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  if (canonical !== slugOrId) {
    return { kind: "redirect", to: `/${canonical}/${subPath}` };
  }

  const [session, cookieTokenHash] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    readParticipantTokenHash(),
  ]);
  const userId = session?.user?.id ?? null;

  // Aucun signal d'identité du tout → gate direct, pas la peine de
  // taper la DB pour `me`.
  if (!userId && !cookieTokenHash) {
    return { kind: "needs-auth", outing, canonical, prefillEmail: null };
  }

  const me = await getMyParticipant({
    outingId: outing.id,
    // `getMyParticipant` exige une string ; quand on n'a que `userId`
    // sans cookie, on passe une chaîne vide qui ne matchera jamais
    // `cookie_token_hash` (varchar(64) non vide en pratique). Le clause
    // OR sur `userId` continue de fonctionner.
    cookieTokenHash: cookieTokenHash ?? "",
    userId,
  });

  if (me) {
    return { kind: "ok", outing, me, canonical };
  }

  // Connecté mais pas dans la sortie → notice claire, pas le gate.
  if (userId && session?.user?.email) {
    return { kind: "not-participant", outing, canonical, userEmail: session.user.email };
  }

  // Cookie présent sans match : on tente de retrouver un anonEmail
  // attaché à ce hash sur n'importe quelle autre sortie pour
  // pré-remplir le formulaire (UX : l'utilisateur n'a pas à retaper
  // un email qu'il a déjà donné lors d'un RSVP précédent).
  let prefillEmail: string | null = null;
  if (cookieTokenHash) {
    const knownAnon = await db.query.participants.findFirst({
      where: and(
        eq(participants.cookieTokenHash, cookieTokenHash),
        isNotNull(participants.anonEmail)
      ),
      columns: { anonEmail: true },
    });
    prefillEmail = knownAnon?.anonEmail ?? null;
  }

  return { kind: "needs-auth", outing, canonical, prefillEmail };
}
