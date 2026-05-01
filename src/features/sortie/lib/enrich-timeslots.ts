import { displayNameOf } from "@/features/sortie/lib/participant-name";

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
 * La duplication possible d'un voteur (si il vote oui sur N créneaux)
 * est volontaire — c'est ce qui nous permet d'afficher "qui veut
 * quand" en un coup d'œil. L'effet "même tête répétée" est en fait un
 * bon signal de disponibilité large.
 */
export function enrichTimeslots(outing: OutingShape): EnrichedTimeslot[] {
  const byId = new Map<string, VoterSummary>();
  for (const p of outing.participants) {
    byId.set(p.id, {
      participantId: p.id,
      name: displayNameOf(p),
      image: p.user?.image ?? null,
      isCreator: isCreatorParticipant(p, outing),
    });
  }

  return outing.timeslots.map((ts) => {
    const yesVoters: VoterSummary[] = [];
    const noVoters: VoterSummary[] = [];
    for (const v of ts.votes) {
      const summary = byId.get(v.participantId);
      if (!summary) {
        continue;
      }
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
}

function isCreatorParticipant(
  p: ParticipantInput,
  outing: { creatorUserId: string | null; creatorCookieTokenHash: string | null }
): boolean {
  if (outing.creatorUserId !== null && p.userId === outing.creatorUserId) {
    return true;
  }
  if (
    outing.creatorCookieTokenHash !== null &&
    p.cookieTokenHash === outing.creatorCookieTokenHash
  ) {
    return true;
  }
  return false;
}
