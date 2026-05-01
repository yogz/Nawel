import { isOutingOwner } from "./owner";
import { displayNameOf } from "./participant-name";

export type VoterSummary = {
  participantId: string;
  name: string | null;
  image: string | null;
  isCreator: boolean;
};

export type EnrichedTimeslot = {
  id: string;
  startsAt: Date;
  yesCount: number;
  noCount: number;
  yesVoters: VoterSummary[];
  noVoters: VoterSummary[];
};

export type EnrichResult = {
  timeslots: EnrichedTimeslot[];
  /** Participants uniques ayant voté ≥1 fois sur n'importe quel créneau. */
  totalVoters: number;
  /** Id du participant correspondant à l'organisateur, ou null s'il n'a pas RSVP. */
  creatorParticipantId: string | null;
};

type ParticipantInput = {
  id: string;
  userId: string | null;
  cookieTokenHash: string | null;
  anonName: string | null;
  user?: { name: string | null; image: string | null } | null;
};

type TimeslotInput = {
  id: string;
  startsAt: Date;
  votes: Array<{ participantId: string; available: boolean }>;
};

type OutingShape = {
  creatorUserId: string | null;
  creatorCookieTokenHash: string | null;
  participants: ParticipantInput[];
  timeslots: TimeslotInput[];
};

/**
 * Joint les `votes[].participantId` aux `participants[]` pour produire
 * une vue par créneau enrichie des identités. Reste pure et server-only :
 * appelée dans la page server component, pas dans la query — la query
 * est partagée avec `generateMetadata` / OG image, on ne veut pas
 * payer le join là où il n'est pas consommé.
 *
 * La duplication possible d'un voteur (s'il vote oui sur N créneaux)
 * est volontaire — c'est ce qui nous permet d'afficher "qui veut
 * quand" en un coup d'œil. L'effet "même tête répétée" est en fait un
 * bon signal de disponibilité large.
 *
 * Retourne aussi `totalVoters` et `creatorParticipantId` calculés au
 * passage — la page consommait ces deux valeurs en re-scannant les
 * mêmes structures, ce qui faisait trois passes sur les votes en hot
 * path public.
 */
export function enrichTimeslots(outing: OutingShape): EnrichResult {
  const byId = new Map<string, VoterSummary>();
  let creatorParticipantId: string | null = null;

  for (const p of outing.participants) {
    const isCreator = isOutingOwner(outing, {
      userId: p.userId,
      cookieTokenHash: p.cookieTokenHash,
    });
    if (isCreator) {
      creatorParticipantId = p.id;
    }
    byId.set(p.id, {
      participantId: p.id,
      name: displayNameOf(p),
      image: p.user?.image ?? null,
      isCreator,
    });
  }

  const voterSet = new Set<string>();
  const timeslots = outing.timeslots.map((ts) => {
    const yesVoters: VoterSummary[] = [];
    const noVoters: VoterSummary[] = [];
    for (const v of ts.votes) {
      const summary = byId.get(v.participantId);
      if (!summary) {
        continue;
      }
      voterSet.add(v.participantId);
      (v.available ? yesVoters : noVoters).push(summary);
    }
    return {
      id: ts.id,
      startsAt: ts.startsAt,
      yesCount: yesVoters.length,
      noCount: noVoters.length,
      yesVoters,
      noVoters,
    };
  });

  return { timeslots, totalVoters: voterSet.size, creatorParticipantId };
}
