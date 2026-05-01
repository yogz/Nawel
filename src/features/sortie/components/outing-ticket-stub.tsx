import type { ReactNode } from "react";

const TZ = "Europe/Paris";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: TZ });
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: TZ });
const monthShortFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TZ });
const weekdayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: TZ });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
const yearFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: TZ });

type Props = { startsAt: Date } | { candidates: Date[] };

/**
 * Bande "ticket stub" affichée juste sous le hero. Le chiffre du jour
 * en font-display géant à gauche sert d'ancre scannable ; mois +
 * weekday empilés en mono complètent ; un trait dashed central évoque
 * la perforation d'un billet ; l'heure ferme la composition à droite.
 *
 * Deux variantes :
 * - **fixed** (`startsAt`) — date arrêtée, layout d'origine.
 * - **poll** (`candidates`) — sondage ouvert, on affiche le 1er
 *   candidat à gauche et un compteur (`N CHOIX` / `N HEURES`) à
 *   droite. Garder l'ancre sur la 1ère date plutôt qu'un range
 *   abstrait préserve la lisibilité au regard, c'est l'inviation qui
 *   compte, pas la borne haute.
 */
export function OutingTicketStub(props: Props) {
  if ("startsAt" in props) {
    return <FixedStub startsAt={props.startsAt} />;
  }
  return <PollStub candidates={props.candidates} />;
}

function FixedStub({ startsAt }: { startsAt: Date }) {
  const day = dayFormatter.format(startsAt);
  const month = monthFormatter.format(startsAt).toUpperCase();
  const weekday = weekdayFormatter.format(startsAt).replace(/\.$/, "").toUpperCase();
  const time = timeFormatter.format(startsAt).replace(":", "H");
  const year = Number(yearFormatter.format(startsAt));
  const showYear = year !== new Date().getFullYear();

  return (
    <StubFrame label="Date de l'événement">
      <BigDigit>{day}</BigDigit>
      <MonoStack>
        <span className="text-ink-700">{month}</span>
        <span className="text-ink-500">{weekday}</span>
        {showYear && <span className="text-ink-400">{year}</span>}
      </MonoStack>
      <Perforation />
      <BigDigit size="md">{time}</BigDigit>
    </StubFrame>
  );
}

function PollStub({ candidates }: { candidates: Date[] }) {
  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  const firstDay = dayFormatter.format(first);
  const lastDay = dayFormatter.format(last);
  const firstMonth = monthFormatter.format(first).toUpperCase();
  const lastMonthShort = monthShortFormatter.format(last).replace(/\.$/, "").toUpperCase();

  const sameDay = sameCalendarDay(first, last);
  const sameMonth = firstMonth === monthFormatter.format(last).toUpperCase();

  const secondLine = sameDay
    ? weekdayFormatter.format(first).replace(/\.$/, "").toUpperCase()
    : sameMonth
      ? `→ ${lastDay}`
      : `→ ${lastDay} ${lastMonthShort}`;

  const counterLabel = sameDay ? "HEURES" : "CHOIX";

  return (
    <StubFrame label={`${candidates.length} dates au vote`}>
      <BigDigit>{firstDay}</BigDigit>
      <MonoStack>
        <span className="text-ink-700">{firstMonth}</span>
        <span className="text-ink-500">{secondLine}</span>
      </MonoStack>
      <Perforation />
      <div className="flex flex-col items-end gap-0.5">
        <BigDigit size="md">{candidates.length}</BigDigit>
        <span className="font-mono text-[11px] leading-tight tracking-[0.22em] text-ink-500 uppercase">
          {counterLabel}
        </span>
      </div>
    </StubFrame>
  );
}

function StubFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <aside
      aria-label={label}
      className="-mx-6 mb-6 flex items-center gap-4 border-y border-surface-400 bg-surface-100 px-6 py-4"
    >
      {children}
    </aside>
  );
}

function BigDigit({ children, size = "lg" }: { children: ReactNode; size?: "lg" | "md" }) {
  const className =
    size === "lg"
      ? "font-display text-[56px] leading-[0.85] font-black tracking-[-0.04em] text-ink-700 sm:text-[64px]"
      : "font-display text-[28px] leading-none font-black tracking-[-0.02em] text-ink-700 sm:text-[32px]";
  return <div className={className}>{children}</div>;
}

function MonoStack({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 font-mono text-[11px] leading-tight tracking-[0.22em] uppercase">
      {children}
    </div>
  );
}

function Perforation() {
  return <div aria-hidden className="flex-1 border-t border-dashed border-surface-400" />;
}

function sameCalendarDay(a: Date, b: Date) {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  });
  return fmt.format(a) === fmt.format(b);
}
