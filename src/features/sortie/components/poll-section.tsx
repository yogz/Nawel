import Link from "next/link";
import type { EnrichedTimeslot } from "@/features/sortie/lib/enrich-timeslots";
import { canReopenPoll } from "@/features/sortie/lib/can-reopen-poll";
import { DeadlineBadge } from "./deadline-badge";
import { PickTimeslotButton } from "./pick-timeslot-button";
import { ReopenPollButton } from "./reopen-poll-button";
import { TimeslotDetailSheet } from "./timeslot-detail-sheet";

type Props = {
  shortId: string;
  timeslots: EnrichedTimeslot[];
  totalVoters: number;
  isCreator: boolean;
  chosenTimeslotId: string | null;
  /** Statut + deadline : décident si la réouverture est encore possible. */
  status: Parameters<typeof canReopenPoll>[0]["status"];
  deadlineAt: Date;
  /** `slug-shortId`, pour pointer vers `/modifier` depuis le refus. */
  canonicalPath: string;
  /**
   * Quand fourni, la deadline est rendue dans le header du sondage —
   * mode "ouvert" où la PollSection absorbe le rôle social et la
   * `ParticipantList` standalone est masquée. En sondage clôturé /
   * mode fixé, la deadline reste dans la section confirmés.
   */
  inlineDeadlineAt?: Date;
};

/**
 * On ne highlight le "meilleur" créneau que s'il y a UN gagnant
 * clair — quand plusieurs sont à égalité (ou tous à zéro), border le
 * rose hot revient à dire "n'importe lequel" et noie le signal.
 *
 * `totalVotes` (somme yes+no) gate l'action de figer, distinct de
 * `totalVoters` (participants uniques) — on veut "y a-t-il eu un
 * vote quelconque", pas "combien de têtes".
 */
export function PollSection({
  shortId,
  timeslots,
  totalVoters,
  isCreator,
  chosenTimeslotId,
  status,
  deadlineAt,
  canonicalPath,
  inlineDeadlineAt,
}: Props) {
  let best = 0;
  let bestCount = 0;
  let totalVotes = 0;
  for (const t of timeslots) {
    totalVotes += t.yesCount + t.noCount;
    if (t.yesCount > best) {
      best = t.yesCount;
      bestCount = 1;
    } else if (t.yesCount === best && best > 0) {
      bestCount += 1;
    }
  }
  const hasUniqueBest = bestCount === 1;
  const canPick = isCreator && !chosenTimeslotId && totalVotes > 0;

  return (
    <section
      className="mt-8 rounded-2xl border border-surface-400 bg-surface-50 p-5"
      aria-label="Vote de créneaux"
    >
      <header className="mb-4 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg text-ink-700">
            {chosenTimeslotId ? "Sondage clôturé" : "Sondage"}
          </h2>
          <span className="text-xs text-ink-400">
            {totalVoters === 0
              ? "Personne n'a voté"
              : `${totalVoters} votant${totalVoters > 1 ? "s" : ""}`}
          </span>
        </div>
        {inlineDeadlineAt && (
          <div className="text-xs">
            <DeadlineBadge deadlineAt={inlineDeadlineAt} />
          </div>
        )}
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

      {isCreator && chosenTimeslotId && (
        <ReopenAffordance
          shortId={shortId}
          verdict={canReopenPoll({ mode: "vote", status, chosenTimeslotId, deadlineAt })}
          canonicalPath={canonicalPath}
        />
      )}
    </section>
  );
}

/**
 * Le bouton "Rouvrir le sondage" n'apparaît que quand l'action aboutirait
 * vraiment. Deux cas se distinguent :
 *
 *   - `votes-closed` : la réouverture est inopérante (personne ne peut plus
 *     voter) mais un chemin existe — repousser la date limite depuis
 *     `/modifier`. On affiche ce chemin plutôt qu'un bouton qui échoue.
 *   - `tickets-bought` : plus aucun chemin légitime, on n'affiche rien. La
 *     correction de date passe par `/modifier`, pas par un re-vote sur une
 *     date déjà payée.
 */
function ReopenAffordance({
  shortId,
  verdict,
  canonicalPath,
}: {
  shortId: string;
  verdict: ReturnType<typeof canReopenPoll>;
  canonicalPath: string;
}) {
  if (verdict.ok) {
    return <ReopenPollButton shortId={shortId} />;
  }
  if (verdict.reason !== "votes-closed") {
    return null;
  }
  return (
    <p className="mt-4 border-t border-surface-400 pt-3 text-xs leading-relaxed text-ink-400">
      Les votes sont clos. Pour remettre la date au vote,{" "}
      <Link
        href={`/${canonicalPath}/modifier`}
        className="text-acid-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600/50"
      >
        repousse d&rsquo;abord la date limite
      </Link>
      .
    </p>
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
