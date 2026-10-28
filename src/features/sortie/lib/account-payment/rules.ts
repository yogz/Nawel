/**
 * Règles pures des moyens de paiement enregistrés sur le compte. Cf.
 * docs/superpowers/specs/2026-10-28-sortie-account-payment-methods-design.md §5 bis.
 *
 * Sécurité : tout passe par `session.user`, jamais par le seul cookie de
 * participation. Le rattachement par e-mail à la connexion peut poser un
 * `userId` sur une ligne participant sans retirer le cookie : une ligne qui
 * porte un compte n'obéit donc plus qu'à ce compte.
 */

export const MAX_ACCOUNT_METHODS = 5;
export const MAX_LABEL_LENGTH = 40;

type Result = { ok: true } | { ok: false; message: string };

/** Nom affiché d'un type de moyen (textes, e-mails). */
export const PAYMENT_TYPE_LABEL: Record<string, string> = {
  iban: "IBAN",
  lydia: "Lydia",
  revolut: "Revolut",
  wero: "Wero",
};

/**
 * Gérer des moyens sur le compte exige un compte connecté à l'e-mail
 * vérifié : l'inscription par mot de passe ne vérifie pas l'adresse, un tiers
 * pourrait donc pré-créer le compte de quelqu'un d'autre.
 */
export function mayManageAccountMethods(s: {
  userId: string | null;
  emailVerified: boolean | null;
}): boolean {
  return s.userId !== null && s.emailVerified === true;
}

/**
 * Copier les moyens du compte sur un achat : seulement si l'acheteur EST le
 * compte connecté. Jamais `buyerUserId` seul (ligne reconnue par cookie),
 * jamais le cookie.
 */
export function mayCopyAccountMethods(a: {
  sessionUserId: string | null;
  buyerUserId: string | null;
}): boolean {
  return a.sessionUserId !== null && a.buyerUserId === a.sessionUserId;
}

/**
 * Ajout / retrait de moyens par sortie : une ligne rattachée à un compte
 * exige la session de ce compte ; une ligne sans compte garde le
 * comportement historique (le cookie suffit).
 */
export function mayEditOutingMethods(a: {
  rowUserId: string | null;
  sessionUserId: string | null;
}): boolean {
  if (a.rowUserId === null) {
    return true;
  }
  return a.sessionUserId === a.rowUserId;
}

/**
 * Libellé affiché aux autres dans leurs e-mails : court, et sans numéro
 * (évite « vire plutôt sur FR76… »). On retire espaces et séparateurs
 * courants avant de chercher une suite de plus de 8 chiffres.
 */
export function validateMethodLabel(
  raw: string | undefined
): { ok: true; label: string | null } | { ok: false; message: string } {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) {
    return { ok: true, label: null };
  }
  if (trimmed.length > MAX_LABEL_LENGTH) {
    return { ok: false, message: "40 caractères maximum." };
  }
  if (/\d{9,}/.test(trimmed.replace(/[\s.\-_]/g, ""))) {
    return { ok: false, message: "Pas de numéro dans le libellé." };
  }
  return { ok: true, label: trimmed.replace(/\s+/g, " ") };
}

/** Même type + même aperçu = déjà présent. */
export function isDuplicateMethod(
  existing: { type: string; valuePreview: string }[],
  type: string,
  valuePreview: string
): boolean {
  return existing.some((m) => m.type === type && m.valuePreview === valuePreview);
}

/** Ajout par sortie : seul le doublon est refusé (pas de plafond). */
export function checkOutingMethodAdd(a: {
  existing: { type: string; valuePreview: string }[];
  type: string;
  valuePreview: string;
}): Result {
  if (isDuplicateMethod(a.existing, a.type, a.valuePreview)) {
    return { ok: false, message: "Déjà ajouté pour cette sortie." };
  }
  return { ok: true };
}

/** Fin visible de l'aperçu (« 1234 » pour un IBAN, « 42 » pour un numéro). */
function previewTail(valuePreview: string): string {
  return valuePreview.match(/[0-9A-Za-z]+$/)?.[0] ?? valuePreview;
}

/**
 * Ajout sur le compte : plafond de moyens confirmés (les ajouts en attente
 * ne comptent pas, ils expirent), puis refus des doublons — en attente
 * compris, pour ne pas envoyer deux liens pour la même coordonnée.
 */
export function checkAccountMethodAdd(a: {
  existing: { type: string; valuePreview: string; confirmedAt: Date | null }[];
  type: string;
  valuePreview: string;
}): Result {
  const confirmedCount = a.existing.filter((m) => m.confirmedAt !== null).length;
  if (confirmedCount >= MAX_ACCOUNT_METHODS) {
    return { ok: false, message: "5 moyens maximum. Retire-en un pour en ajouter un autre." };
  }
  if (isDuplicateMethod(a.existing, a.type, a.valuePreview)) {
    const label = PAYMENT_TYPE_LABEL[a.type] ?? a.type;
    return {
      ok: false,
      message: `Tu as déjà un ${label} qui finit par ${previewTail(a.valuePreview)}.`,
    };
  }
  return { ok: true };
}

/**
 * Ids cochés sur la page achat → ids réellement copiés : intersection avec
 * les moyens CONFIRMÉS du compte connecté (relus en base), dans l'ordre du
 * compte. Un id forgé ou en attente est ignoré sans erreur.
 */
export function selectMethodsToCopy(a: {
  checkedIds: string[];
  accountMethods: { id: string; confirmedAt: Date | null }[];
}): string[] {
  const checked = new Set(a.checkedIds);
  return a.accountMethods
    .filter((m) => m.confirmedAt !== null && checked.has(m.id))
    .map((m) => m.id);
}
