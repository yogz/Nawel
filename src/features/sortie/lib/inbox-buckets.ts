// Buckets par état d'action pour la page lien-privé `/@<username>?k=<token>`.
// Le visiteur arrive avec un seul intent : RSVP à toutes les sorties de
// l'organisateur en checklist. Grouper par état (à toi de jouer / tu viens
// / en attente / tu viens pas) transforme la liste en file d'actions au
// lieu d'un agenda chronologique.
//
// Précédence (1 sortie = 1 bucket, premier match) :
//   1. a-decide  — pas de réponse OU response="interested" mais le
//                  créneau a été tranché (`startsAt != null`) sans que
//                  l'invité n'ait voté pour le slot gagnant.
//                  cf. `pickTimeslotAction` qui laisse "interested" tel
//                  quel pour les non-voteurs du créneau choisi.
//   2. going     — yes / handle_own
//   3. waiting   — interested ET sondage non encore tranché
//                  (`startsAt = null`)
//   4. declined  — no
//
// `startsAt` sert ici de proxy pour "chosen timeslot existe" :
// `pickTimeslotAction` set `fixedDatetime + chosenTimeslotId` ensemble,
// donc `startsAt != null` ⇔ la date est figée (mode vote tranché ou mode
// fixed dès la création). On évite de joindre `chosenTimeslotId` au
// niveau query — proxy stable tant que l'invariant tient.

export type ActionBucketKey = "a-decide" | "going" | "waiting" | "declined";

type Outingish = {
  id: string;
  startsAt: Date | null;
  deadlineAt: Date;
  mode: "fixed" | "vote";
};

type MyRsvpish = {
  response: "yes" | "no" | "handle_own" | "interested" | string;
};

export type ActionBucket<T extends Outingish> = {
  key: ActionBucketKey;
  label: string;
  outings: T[];
};

/**
 * Partitionne une liste de sorties à venir en 4 buckets d'action côté
 * invité. Renvoie les buckets dans l'ordre vertical d'affichage. Buckets
 * vides conservés — au caller de filtrer s'il ne veut pas rendre de
 * header.
 *
 * Ne suppose pas un ordre d'entrée. Trie en interne :
 *   - a-decide / waiting → `deadlineAt` asc (urgence)
 *   - going / declined   → `startsAt` asc (chronologique, sortes sans
 *                          date — vote pas tranché — en queue)
 */
export function bucketizeByAction<T extends Outingish>(
  outings: T[],
  myRsvpByOuting: Map<string, MyRsvpish>
): ActionBucket<T>[] {
  const aDecide: T[] = [];
  const going: T[] = [];
  const waiting: T[] = [];
  const declined: T[] = [];

  for (const o of outings) {
    const my = myRsvpByOuting.get(o.id);

    if (!my) {
      // Aucune row participant → action attendue : RSVP ou voter.
      aDecide.push(o);
      continue;
    }

    if (my.response === "yes" || my.response === "handle_own") {
      going.push(o);
      continue;
    }

    if (my.response === "no") {
      declined.push(o);
      continue;
    }

    if (my.response === "interested") {
      // Si le créneau a été figé (`startsAt != null` sur une sortie en
      // vote mode), `pickTimeslotAction` n'a pas converti la response
      // de cet invité — c'est qu'il n'avait pas voté sur le slot gagnant.
      // Il doit re-RSVP explicitement → bucket d'action.
      if (o.startsAt !== null) {
        aDecide.push(o);
      } else {
        waiting.push(o);
      }
      continue;
    }

    // Response inconnue : on tombe en declined par défaut — moins
    // dangereux que de pousser à l'action sur un état mal compris.
    declined.push(o);
  }

  aDecide.sort(byDeadlineAsc);
  going.sort(byStartsAtAsc);
  waiting.sort(byDeadlineAsc);
  declined.sort(byStartsAtAsc);

  return [
    { key: "a-decide", label: "à toi de jouer", outings: aDecide },
    { key: "going", label: "tu viens", outings: going },
    { key: "waiting", label: "en attente", outings: waiting },
    { key: "declined", label: "tu viens pas", outings: declined },
  ];
}

/**
 * Aplatit les buckets en liste plate triée pour le mode "low-volume" :
 * items "à toi de jouer" en tête (deadline asc), puis "tu viens" /
 * "en attente" (chronologique sur startsAt, avec startsAt null en queue),
 * puis "tu viens pas" en fin. Utilisé quand on a moins de cards que le
 * seuil — empêche les sections labellisées avec 1 seul item.
 */
export function flattenInboxByPriority<T extends Outingish>(buckets: ActionBucket<T>[]): T[] {
  // L'ordre des buckets en entrée est déjà la priorité voulue ; il
  // suffit de concaténer les outings déjà triés par bucket.
  return buckets.flatMap((b) => b.outings);
}

function byDeadlineAsc<T extends { deadlineAt: Date }>(a: T, b: T): number {
  return a.deadlineAt.getTime() - b.deadlineAt.getTime();
}

function byStartsAtAsc<T extends { startsAt: Date | null }>(a: T, b: T): number {
  if (!a.startsAt && !b.startsAt) {
    return 0;
  }
  if (!a.startsAt) {
    return 1;
  }
  if (!b.startsAt) {
    return -1;
  }
  return a.startsAt.getTime() - b.startsAt.getTime();
}
