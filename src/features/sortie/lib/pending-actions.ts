// Aggrégateur des actions en attente du user logged-in sur la home `/`.
// Le hero LiveStatusHero ne parle que d'une seule sortie ; quand le user a
// 5+ outings actives, la maison ne lui dit nulle part "voilà ce qui est
// bloqué sur *toi* maintenant". Cette fonction parcourt ses outings et
// émet une liste d'actions typées pour `PendingActionsInbox`.
//
// Précédence dans une même outing : on retourne au plus 1 action par
// outing. L'ordre des `if` ci-dessous est l'ordre de priorité — un
// outing en `stale_purchase` ne peut plus déclencher "rsvp-soon" même si
// l'invité du créateur n'a pas répondu, parce que l'action côté créateur
// (confirmer l'achat) est plus saillante et bloque tout le reste.
//
// Tone :
//   - hot  → l'action est due ou déjà en retard (deadline atteinte,
//            achat à faire, sondage tranché à valider)
//   - acid → l'action est attendue dans les 48h mais pas urgente

// Sous-ensemble du schéma `outingStatus` qu'on consomme. On ne typé en
// dur que les valeurs qu'on teste — un nouveau statut DB n'a pas à
// faire péter ce module tant qu'aucun trigger ne le concerne.
type OutingStatus =
  | "open"
  | "awaiting_purchase"
  | "stale_purchase"
  | "purchased"
  | "past"
  | "settled"
  | "cancelled";

export type PendingActionKind = "pick-date" | "buy-tickets" | "confirm-purchase" | "rsvp-soon";

export type PendingActionTone = "hot" | "acid";

export type PendingAction = {
  kind: PendingActionKind;
  tone: PendingActionTone;
  outingId: string;
  shortId: string;
  slug: string | null;
  title: string;
  /** Texte court mono-friendly affiché dans la strip ("choisir la date"). */
  label: string;
  /** Trié secondaire : plus la deadline est proche, plus on remonte. */
  deadlineAt: Date;
};

type Outingish = {
  id: string;
  shortId: string;
  slug: string | null;
  title: string;
  startsAt: Date | null;
  deadlineAt: Date;
  status: OutingStatus;
  mode: "fixed" | "vote";
  creatorUserId: string | null;
  chosenTimeslotId: string | null;
};

type MyParticipantish = {
  // null/undefined = pas de réponse → trigger rsvp-soon possible
  response: "yes" | "no" | "handle_own" | "interested" | null | undefined;
};

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export type ComputePendingActionsArgs<T extends Outingish> = {
  outings: T[];
  userId: string;
  /**
   * RSVP du user logged-in par outing. Map vide → on ne déclenche jamais
   * "rsvp-soon" (équivalent : on suppose qu'il a répondu partout). Utile
   * pour les tests et le cas où la query d'enrichissement est skippée.
   */
  myRsvpByOuting?: Map<string, MyParticipantish>;
  /**
   * Ne pas inclure d'action sur cette outing — typiquement la sortie déjà
   * mise en avant par le hero. Le hero porte sa propre nudge (countdown,
   * CTA d'achat) ; doublonner dans la strip ajoute du bruit pour rien.
   */
  excludeOutingId?: string | null;
  now?: Date;
};

export function computePendingActions<T extends Outingish>(
  args: ComputePendingActionsArgs<T>
): PendingAction[] {
  const { outings, userId, myRsvpByOuting, excludeOutingId, now = new Date() } = args;
  const out: PendingAction[] = [];

  for (const o of outings) {
    if (excludeOutingId && o.id === excludeOutingId) {
      continue;
    }

    const isCreator = o.creatorUserId !== null && o.creatorUserId === userId;
    const action = pickAction(o, isCreator, myRsvpByOuting?.get(o.id), now);
    if (action) {
      out.push(action);
    }
  }

  // Tri stable : hot avant acid, puis deadline asc.
  out.sort((a, b) => {
    if (a.tone !== b.tone) {
      return a.tone === "hot" ? -1 : 1;
    }
    return a.deadlineAt.getTime() - b.deadlineAt.getTime();
  });

  return out;
}

function pickAction(
  o: Outingish,
  isCreator: boolean,
  myRsvp: MyParticipantish | undefined,
  now: Date
): PendingAction | null {
  // === Côté créateur ===
  if (isCreator) {
    // 1. Sondage tranché à faire — seul cas où une vote-mode outing
    //    `open` deadline-passée doit interpeller le créateur. Le sweeper
    //    bascule en `awaiting_purchase` quand la date est tranchée par
    //    pickTimeslotAction ; tant que ce n'est pas fait, l'outing reste
    //    `open` avec chosenTimeslotId null et la home doit le crier.
    if (
      o.mode === "vote" &&
      o.chosenTimeslotId === null &&
      o.deadlineAt <= now &&
      o.status === "open"
    ) {
      return makeAction("pick-date", "hot", o, "choisir la date");
    }

    // 2. Achat à faire — sweeper a basculé après la deadline.
    if (o.status === "awaiting_purchase") {
      return makeAction("buy-tickets", "hot", o, "acheter les tickets");
    }

    // 3. Achat à confirmer — purchase form a été rempli mais reste à
    //    finaliser (cf. statut intermédiaire stale_purchase).
    if (o.status === "stale_purchase") {
      return makeAction("confirm-purchase", "hot", o, "confirmer l'achat");
    }
  }

  // === Côté participant (peut aussi être le créateur de l'outing —
  //     un créateur peut très bien ne pas avoir RSVP soi-même si
  //     auto-RSVP est désactivé, mais en V1 on skip ce cas pour éviter
  //     les nudges contradictoires) ===
  if (!isCreator) {
    // 4. Pas répondu et la deadline approche (≤ 48h, encore ouverte).
    //    On reste muet quand la deadline est déjà passée — l'outing
    //    aura basculé en `awaiting_purchase` côté créateur, et l'invité
    //    qui n'a pas répondu a soit raté son tour, soit sera contacté
    //    en privé. Pas le rôle du strip de pousser le retardataire.
    const noResponse =
      !myRsvp ||
      myRsvp.response === null ||
      myRsvp.response === undefined ||
      myRsvp.response === "interested";
    const deadlineSoon =
      o.deadlineAt > now && o.deadlineAt.getTime() - now.getTime() <= TWO_DAYS_MS;

    if (noResponse && deadlineSoon && o.status === "open") {
      return makeAction("rsvp-soon", "acid", o, "réponds bientôt");
    }
  }

  return null;
}

function makeAction(
  kind: PendingActionKind,
  tone: PendingActionTone,
  o: Outingish,
  label: string
): PendingAction {
  return {
    kind,
    tone,
    outingId: o.id,
    shortId: o.shortId,
    slug: o.slug,
    title: o.title,
    label,
    deadlineAt: o.deadlineAt,
  };
}
