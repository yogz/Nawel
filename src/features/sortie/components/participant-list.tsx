import { numberToFrenchCap } from "@/features/sortie/lib/number-fr";

type Participant = {
  id: string;
  userId: string | null;
  anonName: string | null;
  extraAdults: number;
  extraChildren: number;
  response: string;
};

export function ParticipantList({ participants }: { participants: Participant[] }) {
  const yesList = participants.filter((p) => p.response === "yes");
  const totalHeads = yesList.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);

  if (yesList.length === 0) {
    return (
      <p className="text-center text-encre-400">
        Personne n&rsquo;a encore répondu — partage le lien pour que ça démarre.
      </p>
    );
  }

  // Singular form reads "Un a déjà dit oui." which is broken French —
  // "un" isolé n'est pas un pronom. Use the person's name when there's
  // exactly one yes, and fall back to "Quelqu'un" for nameless anons.
  const headline =
    yesList.length === 1
      ? `${yesList[0]!.anonName ?? "Quelqu'un"} a déjà dit oui.`
      : `${numberToFrenchCap(yesList.length)} d'entre vous ont déjà dit oui.`;

  // When the only yes is an anonymous no-name, the headline already says
  // "Quelqu'un a déjà dit oui." — repeating "Quelqu'un" as a bullet below
  // just looks broken. Skip the list in that one case; the totals line still
  // surfaces any accompanying guests.
  const hideList = yesList.length === 1 && !yesList[0]!.anonName;

  return (
    <div>
      <p className="mb-4 text-center font-serif text-xl text-encre-700">{headline}</p>

      {totalHeads > yesList.length && (
        <p className="mb-4 text-center text-sm text-encre-400">
          {numberToFrenchCap(totalHeads)} personnes au total avec les accompagnants.
        </p>
      )}

      {!hideList && (
        <ul className="flex flex-col gap-1">
          {yesList.map((p) => {
            const extras = formatExtras(p.extraAdults, p.extraChildren);
            return (
              <li key={p.id} className="flex items-baseline gap-2 text-encre-600">
                <span className="inline-block size-1.5 shrink-0 rotate-45 bg-or-500" aria-hidden />
                <span>
                  {p.anonName ?? "Quelqu'un"}
                  {extras && <span className="text-encre-400"> {extras}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
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
