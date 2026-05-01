import type { EnrichedTimeslot } from "@/features/sortie/lib/enrich-timeslots";
import { PickTimeslotButton } from "./pick-timeslot-button";
import { ReopenPollButton } from "./reopen-poll-button";
import { TimeslotDetailSheet } from "./timeslot-detail-sheet";

type Props = {
  shortId: string;
  timeslots: EnrichedTimeslot[];
  totalVoters: number;
  isCreator: boolean;
  chosenTimeslotId: string | null;
};

/**
 * Server Component qui rend le sondage de créneaux. Tout le tri /
 * highlight `best` / empty state est statique — seules les actions
 * destructives (figer, rouvrir) sont des Client islands isolés.
 *
 * On ne signale visuellement le "meilleur" créneau que s'il y a UN
 * gagnant clair — quand plusieurs créneaux sont à égalité (ou tous
 * à zéro), border le rose hot sur tous les rangs revient à dire
 * "n'importe lequel" et noie la signal value de la couleur.
 *
 * `totalVotes` (somme des yes+no sur tous les créneaux) gate l'action
 * de figer, distinct de `totalVoters` (participants uniques) — on veut
 * "y a-t-il eu un vote quelconque", pas "combien de têtes".
 */
export function PollSection({
  shortId,
  timeslots,
  totalVoters,
  isCreator,
  chosenTimeslotId,
}: Props) {
  const best = timeslots.reduce((acc, t) => Math.max(acc, t.yesCount), 0);
  const bestCandidates = best > 0 ? timeslots.filter((t) => t.yesCount === best).length : 0;
  const hasUniqueBest = bestCandidates === 1;
  const totalVotes = timeslots.reduce((acc, t) => acc + t.yesCount + t.noCount, 0);
  const canPick = isCreator && !chosenTimeslotId && totalVotes > 0;

  return (
    <section
      className="mt-8 rounded-2xl border border-surface-400 bg-surface-50 p-5"
      aria-label="Vote de créneaux"
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-ink-700">
          {chosenTimeslotId ? "Sondage clôturé" : "Votes en cours"}
        </h2>
        <span className="text-xs text-ink-400">
          {totalVoters === 0
            ? "Personne n'a voté"
            : `${totalVoters} vote${totalVoters > 1 ? "s" : ""}`}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {timeslots.map((ts) => (
          <TimeslotRow
            key={ts.id}
            shortId={shortId}
            ts={ts}
            isBest={hasUniqueBest && ts.yesCount === best}
            isChosen={ts.id === chosenTimeslotId}
            canPick={canPick}
          />
        ))}
      </ul>

      {isCreator && !chosenTimeslotId && totalVotes === 0 && (
        <p className="mt-3 text-xs text-ink-400">
          Personne n&rsquo;a encore voté — partage le lien d&rsquo;abord, sinon tu figeras le
          sondage à l&rsquo;aveugle et plus personne ne pourra voter.
        </p>
      )}

      {isCreator && chosenTimeslotId && <ReopenPollButton shortId={shortId} />}
    </section>
  );
}

function TimeslotRow({
  shortId,
  ts,
  isBest,
  isChosen,
  canPick,
}: {
  shortId: string;
  ts: EnrichedTimeslot;
  isBest: boolean;
  isChosen: boolean;
  canPick: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        isChosen
          ? "border-acid-600 bg-acid-50"
          : isBest
            ? "border-hot-500 bg-surface-100"
            : "border-surface-400 bg-surface-50"
      }`}
    >
      <TimeslotDetailSheet ts={ts} isBest={isBest} isChosen={isChosen} />
      {canPick && (
        <PickTimeslotButton shortId={shortId} timeslotId={ts.id} startsAt={ts.startsAt} />
      )}
    </li>
  );
}
