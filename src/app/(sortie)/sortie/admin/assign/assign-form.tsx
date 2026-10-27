"use client";

import { useActionState, useEffect, useState } from "react";
import {
  adminAssignUserToOutingAction,
  getAdminAssignSnapshotAction,
  type AssignActionState,
  type AssignSnapshot,
} from "@/features/sortie/actions/admin-assign-actions";
import { formatOutingDateShort } from "@/features/sortie/lib/date-fr";
import { plural } from "@/features/sortie/lib/plural";

const RESPONSE_OPTIONS: { value: "yes" | "no" | "handle_own" | "interested"; label: string }[] = [
  { value: "yes", label: "yes — il y va" },
  { value: "handle_own", label: "handle_own — gère son propre ticket" },
  { value: "interested", label: "interested — intéressé (sondage)" },
  { value: "no", label: "no — il ne vient pas" },
];

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Paris",
});

type OutingOption = {
  shortId: string;
  title: string;
  fixedDatetime: Date | null;
  createdAt: Date;
  /** Créneaux d'un sondage non tranché ; null pour une sortie datée. */
  pollSlots: { id: string; startsAt: Date }[] | null;
};

type UserOption = {
  email: string;
  name: string;
};

type Props = {
  /** Pré-groupées côté serveur (cf. `groupAssignOutings`). */
  outings: { upcoming: OutingOption[]; past: OutingOption[] };
  users: UserOption[];
};

type LoadedSnapshot = {
  pairKey: string;
  // Identité de l'état d'action au moment de la lecture : un nouvel envoi
  // produit un nouvel objet et rend la lecture périmée.
  forState: AssignActionState;
  value: AssignSnapshot;
  seq: number;
};

export function AssignForm({ outings, users }: Props) {
  const [state, formAction, pending] = useActionState<AssignActionState, FormData>(
    adminAssignUserToOutingAction,
    {}
  );
  // Contrôlés pour survivre au reset auto du formulaire après l'action :
  // l'admin enchaîne souvent plusieurs invités sur la même sortie.
  const [shortId, setShortId] = useState("");
  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState<LoadedSnapshot | null>(null);

  const allOutings = [...outings.upcoming, ...outings.past];
  const pollSlots = allOutings.find((o) => o.shortId === shortId)?.pollSlots ?? null;
  const pairKey = shortId && email ? `${shortId}|${email}` : "";

  // Relit l'inscription existante à chaque changement de paire et après
  // chaque envoi, pour pré-remplir au lieu d'écraser à l'aveugle.
  useEffect(() => {
    if (!pairKey) {
      return;
    }
    let cancelled = false;
    void getAdminAssignSnapshotAction(shortId, email).then((value) => {
      if (!cancelled) {
        setLoaded((prev) => ({ pairKey, forState: state, value, seq: (prev?.seq ?? 0) + 1 }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pairKey, shortId, email, state]);

  const snapshotReady = loaded !== null && loaded.pairKey === pairKey && loaded.forState === state;
  const snapshot = snapshotReady ? loaded.value : null;
  const waitingSnapshot = pairKey !== "" && !snapshotReady;
  // Remonte les champs à chaque nouvelle lecture pour appliquer ses valeurs
  // par défaut (cases, réponse, extras).
  const fieldsKey = snapshotReady ? `${pairKey}#${loaded.seq}` : pairKey;

  return (
    <form action={formAction} className="space-y-5">
      <Field label="sortie" hint="À venir en tête, passées en dessous.">
        <select
          name="shortId"
          required
          value={shortId}
          onChange={(e) => setShortId(e.target.value)}
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
        >
          <option value="" disabled>
            choisir une sortie…
          </option>
          <optgroup label={`À venir / à voter (${outings.upcoming.length})`}>
            {outings.upcoming.map((o) => (
              <option key={o.shortId} value={o.shortId}>
                {formatOutingLabel(o)}
              </option>
            ))}
          </optgroup>
          <optgroup label={`Passées (${outings.past.length})`}>
            {outings.past.map((o) => (
              <option key={o.shortId} value={o.shortId}>
                {formatOutingLabel(o)}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>

      <Field label="user" hint={`${users.length} comptes (alphabétique).`}>
        <select
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
        >
          <option value="" disabled>
            choisir un user…
          </option>
          {users.map((u) => (
            <option key={u.email} value={u.email}>
              {u.name} — {u.email}
            </option>
          ))}
        </select>
      </Field>

      {pairKey ? (
        <p
          role="status"
          className="rounded-xl border border-surface-300 bg-surface-100 px-4 py-3 text-[13px] text-ink-500"
        >
          {waitingSnapshot
            ? "Vérification de son inscription…"
            : describeSnapshot(snapshot, pollSlots !== null)}
        </p>
      ) : null}

      <div key={fieldsKey} className="space-y-5">
        {pollSlots ? (
          <fieldset>
            <legend className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
              créneaux où il est dispo
            </legend>
            {pollSlots.length === 0 ? (
              <p className="text-[13px] text-ink-400">Aucun créneau proposé sur ce sondage.</p>
            ) : (
              <div className="space-y-2">
                {pollSlots.map((slot) => (
                  <label
                    key={slot.id}
                    className="flex h-12 items-center gap-3 rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700"
                  >
                    <input
                      type="checkbox"
                      name="timeslotId"
                      value={slot.id}
                      defaultChecked={snapshot?.availableTimeslotIds.includes(slot.id) ?? false}
                      className="h-4 w-4 accent-acid-600"
                    />
                    {formatOutingDateShort(slot.startsAt)}
                  </label>
                ))}
              </div>
            )}
            <span className="mt-1 block text-[12px] text-ink-400">
              Coché = dispo, non coché = pas dispo. Remplace ses votes précédents.
            </span>
          </fieldset>
        ) : (
          <Field label="response">
            <select
              name="response"
              required
              defaultValue={snapshot?.response ?? "yes"}
              className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
            >
              {RESPONSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="adultes en +" hint={pollSlots ? undefined : "Si yes uniquement."}>
            <input
              type="number"
              name="extraAdults"
              min={0}
              max={10}
              defaultValue={snapshot?.extraAdults ?? 0}
              className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
            />
          </Field>
          <Field label="enfants en +" hint={pollSlots ? undefined : "Si yes uniquement."}>
            <input
              type="number"
              name="extraChildren"
              min={0}
              max={10}
              defaultValue={snapshot?.extraChildren ?? 0}
              className="h-12 w-full rounded-xl border border-surface-300 bg-surface-50 px-4 text-[14px] text-ink-700 focus:border-acid-600 focus:outline-none"
            />
          </Field>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          role="status"
          className="rounded-xl border border-acid-200 bg-acid-50 px-4 py-3 text-[13px] text-acid-700"
        >
          ✓ {state.ok}
        </p>
      ) : null}

      <button
        type="submit"
        // Pas d'envoi tant que l'inscription existante n'est pas affichée :
        // c'est elle qui évite d'écraser un +1 ou des votes sans le voir.
        disabled={pending || waitingSnapshot}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink-700 px-6 font-mono text-[12px] uppercase tracking-[0.18em] text-surface-50 transition-colors hover:bg-acid-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "assignation…" : snapshot ? "mettre à jour" : "assigner"}
      </button>
    </form>
  );
}

function describeSnapshot(snapshot: AssignSnapshot, isOpenPoll: boolean): string {
  if (!snapshot) {
    return "Pas encore inscrit sur cette sortie.";
  }
  if (isOpenPoll) {
    const n = snapshot.availableTimeslotIds.length;
    return `Déjà inscrit — dispo sur ${n} ${plural(n, "créneau", "créneaux")}${formatExtras(snapshot)}. Ses votes sont pré-cochés : valider les remplacera.`;
  }
  return `Déjà inscrit : ${snapshot.response}${formatExtras(snapshot)}. Valider remplacera cette réponse.`;
}

function formatExtras(snapshot: NonNullable<AssignSnapshot>): string {
  const parts: string[] = [];
  if (snapshot.extraAdults > 0) {
    parts.push(`+${snapshot.extraAdults} ${plural(snapshot.extraAdults, "adulte")}`);
  }
  if (snapshot.extraChildren > 0) {
    parts.push(`+${snapshot.extraChildren} ${plural(snapshot.extraChildren, "enfant")}`);
  }
  return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
}

function formatOutingLabel(o: OutingOption): string {
  const dateLabel = o.fixedDatetime ? DATE_FMT.format(o.fixedDatetime) : "à voter";
  return `${o.title} — ${dateLabel}`;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-ink-400">{hint}</span> : null}
    </label>
  );
}
