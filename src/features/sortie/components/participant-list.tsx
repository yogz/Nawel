import { numberToFrenchCap } from "@/features/sortie/lib/number-fr";

type Participant = {
  id: string;
  userId: string | null;
  anonName: string | null;
  extraAdults: number;
  extraChildren: number;
  response: string;
};

type Props = {
  participants: Participant[];
  resolveUserName?: (userId: string) => string | null;
};

export function ParticipantList({ participants, resolveUserName }: Props) {
  const yesList = participants.filter((p) => p.response === "yes");
  const totalHeads = yesList.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);

  if (yesList.length === 0) {
    return (
      <p className="text-center text-encre-400">
        Personne n&rsquo;a encore répondu — partage le lien pour que ça démarre.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-center font-serif text-xl text-encre-700">
        {numberToFrenchCap(yesList.length)}{" "}
        {yesList.length === 1 ? "a déjà dit oui." : "d'entre vous ont déjà dit oui."}
      </p>

      {totalHeads > yesList.length && (
        <p className="mb-4 text-center text-sm text-encre-400">
          {numberToFrenchCap(totalHeads)} personnes au total avec les accompagnants.
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {yesList.map((p) => {
          const name = p.userId
            ? (resolveUserName?.(p.userId) ?? "Quelqu'un")
            : (p.anonName ?? "Quelqu'un");
          const extras = formatExtras(p.extraAdults, p.extraChildren);
          return (
            <li key={p.id} className="flex items-baseline gap-2 text-encre-600">
              <span className="inline-block size-1.5 shrink-0 rotate-45 bg-or-500" aria-hidden />
              <span>
                {name}
                {extras && <span className="text-encre-400"> {extras}</span>}
              </span>
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
