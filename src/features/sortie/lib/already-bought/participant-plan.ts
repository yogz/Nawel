import { z } from "zod";
import { sanitizeStrictText } from "@/lib/sanitize";
import { normalizeName, personKey, type Regular } from "./regulars";

/**
 * Plan pur de la page « Qui vient ? » : à partir de la liste complète
 * demandée par l'organisateur, calcule les lignes à créer, à mettre à jour
 * et à retirer. La liste REMPLACE l'existant (décocher = retirer), sauf
 * l'organisateur, toujours inscrit.
 *
 * Sécurité (spec 2026-10-28 §5 bis) : l'identité vient du serveur (clé
 * d'habitué résolue via `resolveKey`) ; un nouveau prénom n'est jamais
 * rattaché à un compte ; plafonds anti-spam.
 */

export const MAX_PEOPLE_PER_CALL = 20;
export const MAX_PLACES_PER_OUTING = 100;
export const MAX_NEW_EMAILS_PER_OUTING = 10;
export const MAX_NEW_EMAILS_PER_DAY = 20;

export type CurrentRow = {
  id: string;
  userId: string | null;
  anonName: string | null;
  anonEmail: string | null;
  extraAdults: number;
  extraChildren: number;
};

type Extras = { extraAdults: number; extraChildren: number };

export type RequestedPerson =
  | ({ self: true } & Extras)
  | ({ key: string } & Extras)
  | ({ newName: string; newEmail: string | null } & Extras);

export type NewRow = {
  userId: string | null;
  anonName: string | null;
  anonEmail: string | null;
} & Extras;

export type ParticipantPlan =
  | {
      ok: true;
      inserts: NewRow[];
      updates: ({ id: string } & Extras)[];
      deleteIds: string[];
      /** Nouvelles adresses saisies (à décompter du plafond journalier). */
      newEmailCount: number;
    }
  | { ok: false; message: string; redirectTo?: "dettes" };

const emailSchema = z.string().trim().toLowerCase().email().max(255);

type Desired = { key: string; name: string; row: NewRow; isNewEmail: boolean };

export function planParticipants(a: {
  current: CurrentRow[];
  creatorParticipantId: string;
  requested: RequestedPerson[];
  resolveKey: (key: string) => Regular | undefined;
  hasPurchase: boolean;
  newEmailsToday: number;
}): ParticipantPlan {
  if (a.hasPurchase) {
    return { ok: false, message: "L'achat est déjà déclaré.", redirectTo: "dettes" };
  }
  const others = a.requested.filter(
    (p): p is Exclude<RequestedPerson, { self: true } & Extras> => !("self" in p)
  );
  if (others.length > MAX_PEOPLE_PER_CALL) {
    return { ok: false, message: `Pas plus de ${MAX_PEOPLE_PER_CALL} personnes à la fois.` };
  }

  const desired: Desired[] = [];
  for (const p of others) {
    const extras = { extraAdults: p.extraAdults, extraChildren: p.extraChildren };
    if ("key" in p) {
      const regular = a.resolveKey(p.key);
      if (!regular) {
        return { ok: false, message: "Cette personne n'est pas dans tes habitués." };
      }
      desired.push({
        key: regular.key,
        name: regular.name,
        isNewEmail: false,
        row: regular.userId
          ? { userId: regular.userId, anonName: null, anonEmail: null, ...extras }
          : { userId: null, anonName: regular.name, anonEmail: regular.email, ...extras },
      });
      continue;
    }
    const name = sanitizeStrictText(p.newName, 100).trim();
    if (!name) {
      return { ok: false, message: "Il faut un prénom." };
    }
    let email: string | null = null;
    if (p.newEmail && p.newEmail.trim()) {
      const parsed = emailSchema.safeParse(p.newEmail);
      if (!parsed.success) {
        return { ok: false, message: "E-mail invalide." };
      }
      email = parsed.data;
    }
    desired.push({
      key: personKey({ userId: null, email, anonName: name })!,
      name,
      isNewEmail: email !== null,
      row: { userId: null, anonName: name, anonEmail: email, ...extras },
    });
  }

  // Doublons : même personne ou même prénom affiché dans la sortie.
  const seenKeys = new Set<string>();
  const seenNames = new Map<string, string>();
  for (const d of desired) {
    const n = normalizeName(d.name);
    const existing = seenNames.get(n);
    if (seenKeys.has(d.key) || existing) {
      const name = existing ?? d.name;
      return { ok: false, message: `Il y a déjà une ${name}. Ajoute une initiale : ${name} M.` };
    }
    seenKeys.add(d.key);
    seenNames.set(n, d.name);
  }

  const newEmailCount = desired.filter((d) => d.isNewEmail).length;
  if (newEmailCount > MAX_NEW_EMAILS_PER_OUTING) {
    return {
      ok: false,
      message: `Pas plus de ${MAX_NEW_EMAILS_PER_OUTING} nouvelles adresses par sortie.`,
    };
  }
  if (a.newEmailsToday + newEmailCount > MAX_NEW_EMAILS_PER_DAY) {
    return { ok: false, message: "Trop de nouvelles adresses aujourd'hui. Réessaie demain." };
  }

  const self = a.requested.find((p): p is { self: true } & Extras => "self" in p);
  const creator = a.current.find((r) => r.id === a.creatorParticipantId);
  const creatorExtras = self ?? {
    extraAdults: creator?.extraAdults ?? 0,
    extraChildren: creator?.extraChildren ?? 0,
  };
  const places =
    1 +
    creatorExtras.extraAdults +
    creatorExtras.extraChildren +
    desired.reduce((sum, d) => sum + 1 + d.row.extraAdults + d.row.extraChildren, 0);
  if (places > MAX_PLACES_PER_OUTING) {
    return { ok: false, message: `Pas plus de ${MAX_PLACES_PER_OUTING} places par sortie.` };
  }

  const desiredByKey = new Map(desired.map((d) => [d.key, d]));
  const inserts: NewRow[] = [];
  const updates: ({ id: string } & Extras)[] = [];
  const deleteIds: string[] = [];
  const matched = new Set<string>();

  if (
    creator &&
    (creator.extraAdults !== creatorExtras.extraAdults ||
      creator.extraChildren !== creatorExtras.extraChildren)
  ) {
    updates.push({ id: creator.id, ...creatorExtras });
  }
  for (const row of a.current) {
    if (row.id === a.creatorParticipantId) {
      continue;
    }
    const key = personKey({ userId: row.userId, email: row.anonEmail, anonName: row.anonName });
    const want = key ? desiredByKey.get(key) : undefined;
    if (!want || matched.has(want.key)) {
      deleteIds.push(row.id);
      continue;
    }
    matched.add(want.key);
    if (row.extraAdults !== want.row.extraAdults || row.extraChildren !== want.row.extraChildren) {
      updates.push({
        id: row.id,
        extraAdults: want.row.extraAdults,
        extraChildren: want.row.extraChildren,
      });
    }
  }
  for (const d of desired) {
    if (!matched.has(d.key)) {
      inserts.push(d.row);
    }
  }
  return { ok: true, inserts, updates, deleteIds, newEmailCount };
}
