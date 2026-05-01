const TZ = "Europe/Paris";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: TZ });
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: TZ });
const weekdayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: TZ });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
const yearFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: TZ });

type Props = {
  startsAt: Date;
};

/**
 * Bande "ticket stub" affichée juste sous le hero. Le chiffre du jour
 * en font-display géant à gauche sert d'ancre scannable ; mois +
 * weekday empilés en mono complètent ; un trait dashed central évoque
 * la perforation d'un billet ; l'heure ferme la composition à droite.
 *
 * Remplace l'eyebrow date qui était dans `OutingHero` — elle se
 * perdait en 12 px sur le scrim. Ici la date devient lisible d'un
 * regard sans casser la hiérarchie poster (le titre h1 reste l'ancre
 * unique du hero).
 */
export function OutingTicketStub({ startsAt }: Props) {
  const day = dayFormatter.format(startsAt);
  const month = monthFormatter.format(startsAt).toUpperCase();
  const weekdayRaw = weekdayFormatter.format(startsAt).replace(/\.$/, "");
  const weekday = weekdayRaw.toUpperCase();
  const time = timeFormatter.format(startsAt).replace(":", "H");
  const year = Number(yearFormatter.format(startsAt));
  const currentYear = new Date().getFullYear();
  const showYear = year !== currentYear;

  return (
    <aside
      aria-label="Date de l'événement"
      className="-mx-6 mb-6 flex items-center gap-4 border-y border-surface-400 bg-surface-100 px-6 py-4"
    >
      <div className="font-display text-[56px] leading-[0.85] font-black tracking-[-0.04em] text-ink-700 sm:text-[64px]">
        {day}
      </div>
      <div className="flex flex-col gap-0.5 font-mono text-[11px] leading-tight tracking-[0.22em] uppercase">
        <span className="text-ink-700">{month}</span>
        <span className="text-ink-500">{weekday}</span>
        {showYear && <span className="text-ink-400">{year}</span>}
      </div>
      <div aria-hidden className="flex-1 border-t border-dashed border-surface-400" />
      <div className="font-display text-[28px] leading-none font-black tracking-[-0.02em] text-ink-700 sm:text-[32px]">
        {time}
      </div>
    </aside>
  );
}
