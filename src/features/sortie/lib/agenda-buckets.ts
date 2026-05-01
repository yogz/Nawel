/**
 * Bucketing chronologique pour la page `/sortie/agenda`. Calculé
 * **côté serveur** uniquement — l'horloge Paris fait foi, le client
 * reçoit déjà les groupes formés et n'a pas à re-bucketer (sinon
 * hydration mismatch sur les bordures de jour).
 *
 *   today    → même jour calendaire Paris que `now`
 *   thisWeek → demain inclus jusqu'à dimanche ISO inclus
 *   thisMonth → après dimanche jusqu'à fin du mois calendaire Paris
 *   later    → après ce mois
 *   tbd      → mode vote sans `startsAt` (placé en bas, séparé)
 */

const TZ = "Europe/Paris";

const parisDayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parisWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
});

const parisYearMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
});

export type AgendaBucket = "today" | "thisWeek" | "thisMonth" | "later" | "tbd";

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function parisDayKey(date: Date): string {
  return parisDayKeyFormatter.format(date);
}

function parisYearMonthKey(date: Date): string {
  return parisYearMonthFormatter.format(date);
}

function parisWeekdayMondayFirst(date: Date): number {
  return WEEKDAY_INDEX[parisWeekdayFormatter.format(date)] ?? 0;
}

/**
 * Renvoie le bucket d'une sortie. `startsAt = null` → `tbd`.
 *
 * La logique semaine est lundi-dimanche (ISO) : si `now` est mercredi,
 * `thisWeek` couvre jeudi-dimanche. Si `now` est dimanche, `thisWeek`
 * est forcément vide (today couvre dimanche, lundi tombe dans
 * thisMonth ou later) — c'est voulu, on ne veut pas d'"semaine
 * prochaine" déguisée.
 */
export function bucketForOuting(startsAt: Date | null, now: Date): AgendaBucket {
  if (!startsAt) {
    return "tbd";
  }
  const startKey = parisDayKey(startsAt);
  const nowKey = parisDayKey(now);
  if (startKey === nowKey) {
    return "today";
  }
  if (startKey < nowKey) {
    // Une sortie passée n'a pas vocation à arriver ici (la query filtre
    // déjà), mais on la place dans `today` plutôt que de crasher pour
    // tolérer les sorties qui basculent past entre query et render.
    return "today";
  }

  const todayWeekday = parisWeekdayMondayFirst(now);
  // Nombre de jours entre `now` et le dimanche de la semaine courante
  // (inclus). Lundi=0 → 6 jours jusqu'à dimanche, dimanche=6 → 0 jour.
  const daysUntilSunday = 6 - todayWeekday;
  // On compare via dayKey plutôt que via timestamp pour rester dans le
  // calendrier Paris (évite les approximations DST).
  const sundayDate = new Date(now);
  sundayDate.setUTCDate(sundayDate.getUTCDate() + daysUntilSunday);
  const sundayKey = parisDayKey(sundayDate);

  if (startKey <= sundayKey) {
    return "thisWeek";
  }

  if (parisYearMonthKey(startsAt) === parisYearMonthKey(now)) {
    return "thisMonth";
  }

  return "later";
}

/**
 * Nombre de jours pleins entre `now` et `startsAt` en calendrier Paris.
 * `null` si la sortie est tbd. Compte les jours calendaires (pas les
 * 24h glissantes), donc "demain" = 1 même si la sortie est dans 4h le
 * lendemain. Cohérent avec les eyebrows date qu'on affiche.
 */
export function daysUntilParis(startsAt: Date | null, now: Date): number | null {
  if (!startsAt) {
    return null;
  }
  const startKey = parisDayKey(startsAt);
  const nowKey = parisDayKey(now);
  // Diff via Date construits depuis les keys — assure que DST ne fausse
  // pas le compte (on travaille en jours UTC sur des minuit Paris
  // normalisés via key).
  const startMs = Date.parse(`${startKey}T00:00:00Z`);
  const nowMs = Date.parse(`${nowKey}T00:00:00Z`);
  return Math.round((startMs - nowMs) / 86_400_000);
}

/**
 * Label J-N humain pour la colonne mono à gauche du billet. Volontaire-
 * ment télégraphique : on optimise le scan vertical d'une liste,
 * pas la prose. `null` (tbd) → "?" qui dénote bien l'incertitude.
 */
export function jLabel(daysUntil: number | null): string {
  if (daysUntil === null) {
    return "?";
  }
  if (daysUntil <= 0) {
    return "auj.";
  }
  if (daysUntil === 1) {
    return "demain";
  }
  if (daysUntil < 30) {
    return `J-${daysUntil}`;
  }
  if (daysUntil < 60) {
    return "1 mois";
  }
  const months = Math.round(daysUntil / 30);
  return `${months} mois`;
}

/**
 * Eyebrow texte humain pour le header d'un bucket. `null` si pas de
 * label (cas où on n'a qu'un bucket non-vide → on supprime le header
 * pour éviter le doublon avec le H1 page).
 */
export const BUCKET_LABEL: Record<AgendaBucket, string> = {
  today: "aujourd'hui",
  thisWeek: "cette semaine",
  thisMonth: "ce mois",
  later: "plus tard",
  tbd: "à programmer",
};

export const BUCKET_ORDER: AgendaBucket[] = ["today", "thisWeek", "thisMonth", "later", "tbd"];
