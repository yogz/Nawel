import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * « Habitués » d'un organisateur : les personnes déjà venues à ses sorties,
 * proposées sur la page « Qui vient ? ».
 *
 * Sécurité (spec 2026-10-28 §5 bis) :
 *   - regroupement par compte, sinon par e-mail, sinon par prénom
 *     UNIQUEMENT parmi les lignes sans e-mail — jamais de fusion entre une
 *     ligne avec e-mail et une sans (sinon un invité qui répond « Cécile »
 *     avec son adresse capterait les e-mails destinés à Cécile) ;
 *   - le navigateur ne reçoit qu'une clé opaque (HMAC), le prénom et des
 *     indicateurs — jamais d'adresse ni d'identifiant de compte.
 */

export type RegularRow = {
  userId: string | null;
  userName: string | null;
  anonName: string | null;
  email: string | null;
  outingId: string;
  outingTitle: string;
  startsAt: Date | null;
};

export type Regular = {
  /** Clé interne (serveur uniquement) : `u:<userId>`, `e:<email>` ou `n:<prénom>`. */
  key: string;
  name: string;
  hasEmail: boolean;
  outingsTogether: number;
  lastOutingTitle: string;
  lastOutingAt: Date | null;
  userId: string | null;
  email: string | null;
};

export type RegularView = Pick<
  Regular,
  "key" | "name" | "hasEmail" | "outingsTogether" | "lastOutingTitle" | "lastOutingAt"
>;

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function internalKey(r: RegularRow): string | null {
  if (r.userId) {
    return `u:${r.userId}`;
  }
  if (r.email) {
    return `e:${r.email.trim().toLowerCase()}`;
  }
  const name = r.anonName ? normalizeName(r.anonName) : "";
  return name ? `n:${name}` : null;
}

export function groupRegulars(rows: RegularRow[], creatorUserId: string): Regular[] {
  const byKey = new Map<string, Regular & { outingIds: Set<string> }>();
  for (const r of rows) {
    if (r.userId === creatorUserId) {
      continue;
    }
    const key = internalKey(r);
    const name = (r.userName ?? r.anonName ?? "").trim();
    if (!key || !name) {
      continue;
    }
    const prev = byKey.get(key);
    const at = r.startsAt?.getTime() ?? 0;
    if (!prev) {
      byKey.set(key, {
        key,
        name,
        hasEmail: Boolean(r.email),
        outingsTogether: 0,
        lastOutingTitle: r.outingTitle,
        lastOutingAt: r.startsAt,
        userId: r.userId,
        email: r.email ? r.email.trim().toLowerCase() : null,
        outingIds: new Set([r.outingId]),
      });
      continue;
    }
    prev.outingIds.add(r.outingId);
    if (at >= (prev.lastOutingAt?.getTime() ?? 0)) {
      // Nom et e-mail les plus récents.
      prev.name = name;
      prev.lastOutingTitle = r.outingTitle;
      prev.lastOutingAt = r.startsAt;
      if (r.email) {
        prev.email = r.email.trim().toLowerCase();
        prev.hasEmail = true;
      }
    }
  }
  return [...byKey.values()]
    .map(({ outingIds, ...regular }) => ({ ...regular, outingsTogether: outingIds.size }))
    .sort(
      (a, b) =>
        b.outingsTogether - a.outingsTogether ||
        (b.lastOutingAt?.getTime() ?? 0) - (a.lastOutingAt?.getTime() ?? 0)
    );
}

function opaqueKey(key: string, secret: string): string {
  return createHmac("sha256", secret).update(key).digest("base64url").slice(0, 22);
}

export function toRegularView(r: Regular, secret: string): RegularView {
  return {
    key: opaqueKey(r.key, secret),
    name: r.name,
    hasEmail: r.hasEmail,
    outingsTogether: r.outingsTogether,
    lastOutingTitle: r.lastOutingTitle,
    lastOutingAt: r.lastOutingAt,
  };
}

/** Retrouve un habitué à partir de la clé opaque reçue du navigateur. */
export function findRegularByViewKey(
  regulars: Regular[],
  viewKey: string,
  secret: string
): Regular | undefined {
  const wanted = Buffer.from(viewKey);
  return regulars.find((r) => {
    const candidate = Buffer.from(opaqueKey(r.key, secret));
    return candidate.length === wanted.length && timingSafeEqual(candidate, wanted);
  });
}
