import { numberToFrenchCap } from "@/features/sortie/lib/number-fr";
import { displayNameOf } from "@/features/sortie/lib/participant-name";
import { UserAvatar } from "./user-avatar";

type Participant = {
  id: string;
  userId: string | null;
  anonName: string | null;
  user?: { name: string | null; image: string | null } | null;
  extraAdults: number;
  extraChildren: number;
  response: string;
};

export function ParticipantList({ participants }: { participants: Participant[] }) {
  const yesList = participants.filter((p) => p.response === "yes");
  const handleOwnList = participants.filter((p) => p.response === "handle_own");
  const interestedList = participants.filter((p) => p.response === "interested");
  const totalHeads = yesList.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);

  const hasAnyPositive = yesList.length + handleOwnList.length + interestedList.length > 0;

  if (!hasAnyPositive) {
    return (
      <p className="text-center text-encre-400">
        Personne n&rsquo;a encore répondu — partage le lien pour que ça démarre.
      </p>
    );
  }

  const firstName = yesList.length === 1 ? displayNameOf(yesList[0]!) : null;

  // Singular form reads "Un a déjà dit oui." which is broken French —
  // "un" isolé n'est pas un pronom. Use the person's name when there's
  // exactly one yes, and fall back to "Quelqu'un" for nameless anons.
  const headline =
    yesList.length === 0
      ? "Pas encore de oui ferme."
      : yesList.length === 1
        ? `${firstName ?? "Quelqu'un"} a déjà dit oui.`
        : `Vous êtes ${numberToFrenchCap(yesList.length)} à avoir dit oui.`;

  // When the only yes is an anonymous no-name, the headline already says
  // "Quelqu'un a déjà dit oui." — repeating "Quelqu'un" as a bullet below
  // just looks broken. Skip the list in that one case; the totals line still
  // surfaces any accompanying guests.
  const hideList = yesList.length === 1 && !firstName;

  return (
    <div>
      <p className="mb-4 text-center font-serif text-xl text-encre-700">{headline}</p>

      {totalHeads > yesList.length && (
        <p className="mb-4 text-center text-sm text-encre-400">
          {numberToFrenchCap(totalHeads)} personnes au total avec les accompagnants.
        </p>
      )}

      {!hideList && yesList.length > 0 && (
        <ul className="flex flex-col gap-2">
          {yesList.map((p) => {
            const extras = formatExtras(p.extraAdults, p.extraChildren);
            const display = displayNameOf(p) ?? "Quelqu'un";
            return (
              <li key={p.id} className="flex items-center gap-2.5 text-encre-600">
                <UserAvatar name={display} image={p.user?.image ?? null} size={28} />
                <span className="min-w-0 truncate">
                  {display}
                  {extras && <span className="text-encre-400"> {extras}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {handleOwnList.length > 0 && (
        <SecondarySection
          label="Avec leur propre billet"
          count={handleOwnList.length}
          rows={handleOwnList}
        />
      )}

      {interestedList.length > 0 && (
        <SecondarySection label="Intéressés" count={interestedList.length} rows={interestedList} />
      )}
    </div>
  );
}

function SecondarySection({
  label,
  count,
  rows,
}: {
  label: string;
  count: number;
  rows: Participant[];
}) {
  return (
    <div className="mt-5 border-t border-ivoire-400 pt-4">
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-encre-400">
        {label} · {count}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((p) => {
          const display = displayNameOf(p) ?? "Quelqu'un";
          return (
            <li key={p.id} className="flex items-center gap-2.5 text-encre-500">
              <UserAvatar name={display} image={p.user?.image ?? null} size={24} />
              <span className="min-w-0 truncate">{display}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatExtras(adults: number, children: number): string | null {
  const parts: string[] = [];
  if (adults > 0) {
    parts.push(`+${adults} ${adults === 1 ? "adulte" : "adultes"}`);
  }
  if (children > 0) {
    parts.push(`+${children} ${children === 1 ? "enfant" : "enfants"}`);
  }
  return parts.length > 0 ? `(${parts.join(", ")})` : null;
}
