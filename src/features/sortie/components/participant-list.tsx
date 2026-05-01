import { numberToFrenchCap } from "@/features/sortie/lib/number-fr";
import { displayNameOf } from "@/features/sortie/lib/participant-name";
import { AnimatedCount } from "./animated-count";
import { Eyebrow } from "./eyebrow";
import { RemoveParticipantButton } from "./remove-participant-dialog";
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
  shortId,
  meId = null,
  creatorParticipantId = null,
}: {
  participants: Participant[];
  isCreator?: boolean;
  /** Requis pour rendre les contrôles owner de retrait. */
  shortId?: string;
  /** Id du participant correspondant au viewer — sa propre ligne ne montre
   * pas le bouton de retrait owner (il a déjà "Retirer ma réponse"). */
  meId?: string | null;
  /** Id du participant qui correspond au créateur de la sortie. Sert à
   * détecter le cas "le seul oui est l'auto-RSVP du créateur" pour
   * éviter une headline tautologique du genre "Léa a déjà dit oui." sur
   * sa propre sortie. */
  creatorParticipantId?: string | null;
}) {
  const yesList = participants.filter((p) => p.response === "yes");
  const handleOwnList = participants.filter((p) => p.response === "handle_own");
  const interestedList = participants.filter((p) => p.response === "interested");
  const totalHeads = yesList.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);

  const hasAnyPositive = yesList.length + handleOwnList.length + interestedList.length > 0;

  if (!hasAnyPositive) {
    return (
      <div className="text-center">
        <Eyebrow className="mb-2">─ first to commit ─</Eyebrow>
        <p className="font-display text-[22px] leading-[1.05] font-black tracking-[-0.025em] text-ink-700">
          Radio silence.
          <br />
          {isCreator ? (
            // Le créateur a accès aux boutons de partage juste au-dessus.
            // L'invitation à partager n'a de sens que pour lui.
            <span className="text-acid-600">Partage le lien.</span>
          ) : (
            // Pour un invité, on retourne l'incitation : c'est lui qui
            // peut être le premier à dire oui, pas un partageur de lien.
            <span className="text-acid-600">Sois le premier à dire oui.</span>
          )}
        </p>
      </div>
    );
  }

  const firstName = yesList.length === 1 ? displayNameOf(yesList[0]!) : null;
  // Cas "yes solo = créateur qui s'auto-RSVP sa propre sortie" — banal
  // ("Léa a déjà dit oui." sur la sortie de Léa). Inverser en preuve
  // sociale active : c'est l'orga qui ouvre la liste, à un invité d'y
  // entrer (ou au créateur de partager le lien). Même philosophie que
  // l'empty state : le copy s'adapte au viewer.
  const onlyYesIsCreator =
    yesList.length === 1 &&
    creatorParticipantId !== null &&
    yesList[0]!.id === creatorParticipantId;

  // Singular form reads "Un a déjà dit oui." which is broken French —
  // "un" isolé n'est pas un pronom. Use the person's name when there's
  // exactly one yes, and fall back to "Quelqu'un" for nameless anons.
  const headline =
    yesList.length === 0 ? (
      "Pas encore de oui ferme."
    ) : onlyYesIsCreator ? (
      isCreator ? (
        <>
          Pour l&rsquo;instant, juste toi.
          <br />
          <span className="text-acid-600">Partage le lien.</span>
        </>
      ) : (
        <>
          Pour l&rsquo;instant, juste {firstName ?? "l'orga"}.
          <br />
          <span className="text-acid-600">Sois le premier à le rejoindre.</span>
        </>
      )
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
      <Eyebrow className="mb-2 text-center">─ they&rsquo;re in ─</Eyebrow>
      <p
        className="mb-4 text-center font-display text-[24px] leading-[1.05] font-black tracking-[-0.025em] text-ink-700"
        style={{ textWrap: "balance" }}
      >
        {headline}
      </p>

      {totalHeads > yesList.length && (
        <p className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
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
              <li key={p.id} className="flex items-center gap-3 text-ink-600">
                <UserAvatar name={display} image={p.user?.image ?? null} size={32} />
                <span className="min-w-0 flex-1 truncate text-base">
                  {display}
                  {extras && <span className="text-ink-400"> {extras}</span>}
                </span>
                {isCreator && shortId && p.id !== meId && (
                  <RemoveParticipantButton
                    shortId={shortId}
                    participantId={p.id}
                    displayName={display}
                  />
                )}
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
          isCreator={isCreator}
          shortId={shortId}
          meId={meId}
        />
      )}

      {interestedList.length > 0 && (
        <SecondarySection
          label="Intéressés"
          count={interestedList.length}
          rows={interestedList}
          isCreator={isCreator}
          shortId={shortId}
          meId={meId}
        />
      )}
    </div>
  );
}

function SecondarySection({
  label,
  count,
  rows,
  isCreator,
  shortId,
  meId,
}: {
  label: string;
  count: number;
  rows: Participant[];
  isCreator: boolean;
  shortId: string | undefined;
  meId: string | null;
}) {
  // Total des places projetées pour cette section (utile surtout pour
  // "Intéressés" en mode vote : l'orga doit pouvoir réserver les places
  // dès le sondage, donc visualiser combien de personnes sont à prévoir
  // si tout le monde se confirme).
  const sectionHeads = rows.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);
  const showHeads = sectionHeads > rows.length;

  return (
    <div className="mt-5 border-t border-surface-400 pt-4">
      <Eyebrow tone="hot" className="mb-2">
        {label} · {String(count).padStart(2, "0")}
        {showHeads && (
          <span className="ml-2 text-ink-400">◉ {sectionHeads} avec les accompagnants</span>
        )}
      </Eyebrow>
      <ul className="flex flex-col gap-2">
        {rows.map((p) => {
          const display = displayNameOf(p) ?? "Quelqu'un";
          const extras = formatExtras(p.extraAdults, p.extraChildren);
          return (
            <li key={p.id} className="flex items-center gap-3 text-ink-500">
              <UserAvatar name={display} image={p.user?.image ?? null} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {display}
                {extras && <span className="text-ink-400"> {extras}</span>}
              </span>
              {isCreator && shortId && p.id !== meId && (
                <RemoveParticipantButton
                  shortId={shortId}
                  participantId={p.id}
                  displayName={display}
                />
              )}
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
