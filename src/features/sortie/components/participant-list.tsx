import { numberToFrenchCap } from "@/features/sortie/lib/number-fr";
import { displayNameOf } from "@/features/sortie/lib/participant-name";
import { AnimatedCount } from "./animated-count";
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

export function ParticipantList({
  participants,
  isCreator = false,
}: {
  participants: Participant[];
  isCreator?: boolean;
}) {
  const yesList = participants.filter((p) => p.response === "yes");
  const handleOwnList = participants.filter((p) => p.response === "handle_own");
  const interestedList = participants.filter((p) => p.response === "interested");
  const totalHeads = yesList.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);

  const hasAnyPositive = yesList.length + handleOwnList.length + interestedList.length > 0;

  if (!hasAnyPositive) {
    return (
      <div className="text-center">
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
          ─ first to commit ─
        </p>
        <p
          className="text-[22px] leading-[1.05] font-black tracking-[-0.025em] text-encre-700"
          style={{ fontFamily: "var(--font-inter-tight), system-ui, sans-serif" }}
        >
          Personne n&rsquo;a encore tappé.
          <br />
          {isCreator ? (
            // Le créateur a accès aux boutons de partage juste au-dessus.
            // L'invitation à partager n'a de sens que pour lui.
            <span className="text-bordeaux-600">Partage le lien.</span>
          ) : (
            // Pour un invité, on retourne l'incitation : c'est lui qui
            // peut être le premier à dire oui, pas un partageur de lien.
            <span className="text-bordeaux-600">Sois le premier à dire oui.</span>
          )}
        </p>
      </div>
    );
  }

  const firstName = yesList.length === 1 ? displayNameOf(yesList[0]!) : null;

  // Singular form reads "Un a déjà dit oui." which is broken French —
  // "un" isolé n'est pas un pronom. Use the person's name when there's
  // exactly one yes, and fall back to "Quelqu'un" for nameless anons.
  const headline =
    yesList.length === 0 ? (
      "Pas encore de oui ferme."
    ) : yesList.length === 1 ? (
      `${firstName ?? "Quelqu'un"} a déjà dit oui.`
    ) : (
      <>
        Vous êtes{" "}
        <AnimatedCount value={yesList.length}>{numberToFrenchCap(yesList.length)}</AnimatedCount> à
        avoir dit oui.
      </>
    );

  // When the only yes is an anonymous no-name, the headline already says
  // "Quelqu'un a déjà dit oui." — repeating "Quelqu'un" as a bullet below
  // just looks broken. Skip the list in that one case; the totals line still
  // surfaces any accompanying guests.
  const hideList = yesList.length === 1 && !firstName;

  return (
    <div>
      <p className="mb-2 text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-bordeaux-600">
        ─ they&rsquo;re in ─
      </p>
      <p
        className="mb-4 text-center text-[24px] leading-[1.05] font-black tracking-[-0.025em] text-encre-700"
        style={{
          fontFamily: "var(--font-inter-tight), system-ui, sans-serif",
          textWrap: "balance",
        }}
      >
        {headline}
      </p>

      {totalHeads > yesList.length && (
        <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-encre-400">
          ◉ <AnimatedCount value={totalHeads}>{numberToFrenchCap(totalHeads)}</AnimatedCount>{" "}
          personnes avec les accompagnants
        </p>
      )}

      {!hideList && yesList.length > 0 && (
        <ul className="flex flex-col gap-2">
          {yesList.map((p) => {
            const extras = formatExtras(p.extraAdults, p.extraChildren);
            const display = displayNameOf(p) ?? "Quelqu'un";
            return (
              <li key={p.id} className="flex items-center gap-3 text-encre-600">
                <UserAvatar name={display} image={p.user?.image ?? null} size={32} />
                <span className="min-w-0 truncate text-base">
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
      <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-or-500">
        {label} · {String(count).padStart(2, "0")}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((p) => {
          const display = displayNameOf(p) ?? "Quelqu'un";
          return (
            <li key={p.id} className="flex items-center gap-3 text-encre-500">
              <UserAvatar name={display} image={p.user?.image ?? null} size={28} />
              <span className="min-w-0 truncate text-sm">{display}</span>
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
