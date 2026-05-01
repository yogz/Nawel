"use client";

import { useMemo, useState } from "react";
import { AgendaHeatmap } from "@/features/sortie/components/agenda-heatmap";
import { AgendaTimeline } from "@/features/sortie/components/agenda-timeline";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { bucketAgendaByDay, buildMonthGrids } from "@/features/sortie/lib/agenda-grid";
import { getAgendaRsvpBucket, type AgendaRsvpBucket } from "@/features/sortie/lib/rsvp-response";
import type { AgendaItem } from "@/features/sortie/queries/outing-queries";

type Props = {
  items: AgendaItem[];
  /** ISO du `now` snapshoté côté serveur — garantit que la fenêtre 90j
   * et les "today" alignent serveur et client (sinon une page chargée
   * un peu après minuit décalerait). */
  nowIso: string;
};

type TypeFilter = "fixed" | "vote";

const ALL_TYPES: TypeFilter[] = ["fixed", "vote"];
const ALL_RSVP: AgendaRsvpBucket[] = ["yes", "maybe", "no", "creator", "pending"];

const TYPE_LABEL: Record<TypeFilter, string> = {
  fixed: "datée",
  vote: "sondage",
};
const RSVP_LABEL: Record<AgendaRsvpBucket, string> = {
  yes: "tu y vas",
  maybe: "intéressé",
  no: "non",
  creator: "tu organises",
  pending: "à répondre",
};

export function AgendaView({ items, nowIso }: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [activeTypes, setActiveTypes] = useState<Set<TypeFilter>>(() => new Set(ALL_TYPES));
  const [activeRsvps, setActiveRsvps] = useState<Set<AgendaRsvpBucket>>(() => new Set(ALL_RSVP));

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) => activeTypes.has(item.mode) && activeRsvps.has(getAgendaRsvpBucket(item))
      ),
    [items, activeTypes, activeRsvps]
  );

  const { buckets, months } = useMemo(() => {
    const b = bucketAgendaByDay(filteredItems);
    return { buckets: b, months: buildMonthGrids(now, b) };
  }, [filteredItems, now]);

  const toggleType = (key: TypeFilter) => setActiveTypes((s) => toggle(s, key));
  const toggleRsvp = (key: AgendaRsvpBucket) => setActiveRsvps((s) => toggle(s, key));

  return (
    <>
      <Filters
        activeTypes={activeTypes}
        activeRsvps={activeRsvps}
        onToggleType={toggleType}
        onToggleRsvp={toggleRsvp}
      />

      <AgendaHeatmap months={months} buckets={buckets} />

      <section className="mt-10">
        <Eyebrow tone="acid" className="mb-4">
          ─ chronologie ─
        </Eyebrow>
        <AgendaTimeline items={filteredItems} now={now} />
      </section>
    </>
  );
}

function Filters({
  activeTypes,
  activeRsvps,
  onToggleType,
  onToggleRsvp,
}: {
  activeTypes: Set<TypeFilter>;
  activeRsvps: Set<AgendaRsvpBucket>;
  onToggleType: (k: TypeFilter) => void;
  onToggleRsvp: (k: AgendaRsvpBucket) => void;
}) {
  return (
    <div className="mb-6 space-y-3">
      <FilterRow label="type">
        {ALL_TYPES.map((k) => (
          <FilterPill
            key={k}
            label={TYPE_LABEL[k]}
            active={activeTypes.has(k)}
            tone={k === "vote" ? "hot" : "acid"}
            onToggle={() => onToggleType(k)}
          />
        ))}
      </FilterRow>
      <FilterRow label="rsvp">
        {ALL_RSVP.map((k) => (
          <FilterPill
            key={k}
            label={RSVP_LABEL[k]}
            active={activeRsvps.has(k)}
            tone={rsvpTone(k)}
            onToggle={() => onToggleRsvp(k)}
          />
        ))}
      </FilterRow>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      {children}
    </div>
  );
}

type PillTone = "acid" | "hot" | "neutral";

function FilterPill({
  label,
  active,
  tone,
  onToggle,
}: {
  label: string;
  active: boolean;
  tone: PillTone;
  onToggle: () => void;
}) {
  // États : actif (couleur pleine de la teinte) vs éteint (gris dim).
  // Le toggle en active=true == "inclus dans le filtre", false == "exclu".
  const activeClass =
    tone === "acid"
      ? "bg-acid-500/15 text-acid-500 ring-acid-500/30"
      : tone === "hot"
        ? "bg-hot-500/15 text-hot-500 ring-hot-500/30"
        : "bg-ink-700/10 text-ink-600 ring-ink-700/20";
  const inactiveClass = "bg-surface-200 text-ink-400 ring-white/5";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`inline-flex h-7 items-center rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] ring-1 transition-colors duration-motion-standard ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label}
    </button>
  );
}

function rsvpTone(k: AgendaRsvpBucket): PillTone {
  if (k === "yes") {
    return "acid";
  }
  if (k === "maybe") {
    return "hot";
  }
  return "neutral";
}

function toggle<T>(set: Set<T>, key: T): Set<T> {
  const next = new Set(set);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}
