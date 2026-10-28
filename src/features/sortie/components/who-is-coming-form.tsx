"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { saveWhoIsComingAction } from "@/features/sortie/actions/who-is-coming-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";
import type { RegularView } from "@/features/sortie/lib/already-bought/regulars";
import { GuestCountStepper } from "@/features/sortie/components/guest-count-stepper";
import { UserAvatar } from "@/features/sortie/components/user-avatar";

export type WhoIsComingRegular = RegularView & {
  /** Déjà inscrit à cette sortie. */
  selected: boolean;
  extraAdults: number;
  extraChildren: number;
};

type Extras = { extraAdults: number; extraChildren: number };
type NewPerson = { id: number; name: string; email: string } & Extras;

type Props = {
  shortId: string;
  regulars: WhoIsComingRegular[];
  self: Extras;
};

const NO_EXTRAS: Extras = { extraAdults: 0, extraChildren: 0 };

function places(e: Extras): number {
  return 1 + e.extraAdults + e.extraChildren;
}

export function WhoIsComingForm({ shortId, regulars, self: initialSelf }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    saveWhoIsComingAction,
    {}
  );
  const [self, setSelf] = useState<Extras>(initialSelf);
  const [selected, setSelected] = useState<Map<string, Extras>>(
    () =>
      new Map(
        regulars
          .filter((r) => r.selected)
          .map((r) => [r.key, { extraAdults: r.extraAdults, extraChildren: r.extraChildren }])
      )
  );
  const [added, setAdded] = useState<NewPerson[]>([]);
  const [adding, setAdding] = useState(regulars.length === 0);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");

  const total =
    places(self) +
    [...selected.values()].reduce((sum, e) => sum + places(e), 0) +
    added.reduce((sum, p) => sum + places(p), 0);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, NO_EXTRAS);
      }
      return next;
    });
  }

  function addPerson() {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    setAdded((prev) => [...prev, { id: Date.now(), name, email: draftEmail.trim(), ...NO_EXTRAS }]);
    setDraftName("");
    setDraftEmail("");
    setAdding(false);
  }

  const payload = JSON.stringify({
    shortId,
    people: [
      { self: true, ...self },
      ...[...selected.entries()].map(([key, e]) => ({ key, ...e })),
      ...added.map((p) => ({
        newName: p.name,
        newEmail: p.email || null,
        extraAdults: p.extraAdults,
        extraChildren: p.extraChildren,
      })),
    ],
  });

  return (
    <form action={formAction} className="flex flex-col gap-3 pb-28">
      <input type="hidden" name="payload" value={payload} />

      <PersonRow name="Toi" subtitle="compté" checked locked>
        <ExtrasSteppers value={self} onChange={setSelf} />
      </PersonRow>

      {added.map((p) => (
        <PersonRow
          key={p.id}
          name={p.name}
          subtitle={p.email ? "nouveau" : "nouveau · pas d'e-mail"}
          checked
          onToggle={() => setAdded((prev) => prev.filter((x) => x.id !== p.id))}
        >
          <ExtrasSteppers
            value={p}
            onChange={(e) =>
              setAdded((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...e } : x)))
            }
          />
        </PersonRow>
      ))}

      {regulars.length === 0 && (
        <p className="text-sm text-ink-400">
          Pas encore d&rsquo;habitués. Ceux qui viennent à tes sorties apparaîtront ici.
        </p>
      )}

      {regulars.map((r) => {
        const extras = selected.get(r.key);
        return (
          <PersonRow
            key={r.key}
            name={r.name}
            subtitle={`${r.outingsTogether} ${r.outingsTogether > 1 ? "sorties" : "sortie"} ensemble · ${r.lastOutingTitle}`}
            noEmail={!r.hasEmail}
            checked={extras !== undefined}
            onToggle={() => toggle(r.key)}
          >
            {extras && (
              <ExtrasSteppers
                value={extras}
                onChange={(e) => setSelected((prev) => new Map(prev).set(r.key, e))}
              />
            )}
          </PersonRow>
        );
      })}

      {adding ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-surface-400 bg-surface-100 p-4">
          <label className="flex flex-col gap-1.5 text-sm text-ink-500">
            Prénom
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={100}
              className="h-11 rounded-xl border border-surface-400 bg-surface-50 px-3 text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600/50"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink-500">
            E-mail (facultatif)
            <input
              type="email"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              maxLength={255}
              className="h-11 rounded-xl border border-surface-400 bg-surface-50 px-3 text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600/50"
            />
            <span className="text-xs text-ink-400">Pour qu&rsquo;il reçoive sa part.</span>
          </label>
          <button
            type="button"
            onClick={addPerson}
            disabled={!draftName.trim()}
            className="h-11 rounded-full bg-ink-700 font-bold text-surface-50 disabled:opacity-40 motion-safe:transition-transform motion-safe:active:scale-[0.98]"
          >
            Ajouter
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-12 rounded-2xl border border-dashed border-surface-400 text-sm font-bold text-ink-500 hover:text-acid-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600/50"
        >
          + Ajouter quelqu&rsquo;un
        </button>
      )}

      {state.message && (
        <p role="alert" className="text-sm text-hot-600">
          {state.message}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 bg-surface-50/95 px-6 pb-6 pt-3">
        <button
          type="submit"
          disabled={pending}
          className="mx-auto flex h-16 w-full max-w-xl items-center justify-center rounded-full bg-acid-600 text-base font-black text-surface-50 disabled:opacity-50 motion-safe:transition-transform motion-safe:active:scale-[0.98]"
        >
          {pending ? "Enregistrement…" : `Continuer · ${total} ${total > 1 ? "places" : "place"} →`}
        </button>
      </div>
    </form>
  );
}

function PersonRow({
  name,
  subtitle,
  noEmail = false,
  checked,
  locked = false,
  onToggle,
  children,
}: {
  name: string;
  subtitle: string;
  noEmail?: boolean;
  checked: boolean;
  locked?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-surface-400 bg-surface-100">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-disabled={locked}
        aria-label={name}
        onClick={locked ? undefined : onToggle}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid-600/50 motion-safe:transition-transform motion-safe:active:scale-[0.98]"
      >
        <UserAvatar name={name} size={36} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold text-ink-700">{name}</span>
          <span className="truncate text-xs text-ink-400">
            {subtitle}
            {noEmail && (
              <>
                {" · "}
                <span>pas d&rsquo;e-mail</span>
              </>
            )}
          </span>
        </span>
        <span
          aria-hidden
          className={`flex h-7 w-7 items-center justify-center rounded-full border ${
            checked ? "border-acid-600 bg-acid-600 text-surface-50" : "border-surface-400"
          }`}
        >
          {checked && <Check size={16} strokeWidth={3} />}
        </span>
      </button>
      {children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ExtrasSteppers({ value, onChange }: { value: Extras; onChange: (e: Extras) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <GuestCountStepper
        label="Adultes en plus"
        name="extraAdults"
        value={value.extraAdults}
        max={10}
        onChange={(n) => onChange({ ...value, extraAdults: n })}
      />
      <GuestCountStepper
        label="Enfants"
        name="extraChildren"
        value={value.extraChildren}
        max={10}
        onChange={(n) => onChange({ ...value, extraChildren: n })}
      />
    </div>
  );
}
