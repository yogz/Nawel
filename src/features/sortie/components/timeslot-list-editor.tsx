"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "./date-time-picker";

// Client-side state shape; we JSON-encode this into a hidden input on submit
// and the server schema parses it back. The `key` is a client-only identity
// used by React reconciliation — it never leaves this file.
type SlotDraft = {
  key: string;
  startsAt: string;
};

const MIN = 2;
const MAX = 8;

function makeKey(): string {
  return `ts_${Math.random().toString(36).slice(2, 10)}`;
}

export function TimeslotListEditor({
  hiddenInputName,
  error,
}: {
  hiddenInputName: string;
  error?: string;
}) {
  const [slots, setSlots] = useState<SlotDraft[]>([
    { key: makeKey(), startsAt: "" },
    { key: makeKey(), startsAt: "" },
  ]);

  // Only non-empty slots are serialized — the schema rejects empties anyway,
  // and we don't want a stray blank one the user forgot about to block submit.
  const serializable = slots
    .filter((s) => s.startsAt)
    .map((s, idx) => ({
      startsAt: s.startsAt,
      position: idx,
    }));

  function updateSlot(key: string, value: string) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, startsAt: value } : s)));
  }

  function addSlot() {
    if (slots.length >= MAX) {
      return;
    }
    setSlots((prev) => [...prev, { key: makeKey(), startsAt: "" }]);
  }

  function removeSlot(key: string) {
    if (slots.length <= MIN) {
      return;
    }
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <Label className="text-[13px] font-medium text-ink-500">Créneaux proposés</Label>
        <span className="text-xs text-ink-400">
          {slots.length} sur {MAX}
        </span>
      </div>

      <input type="hidden" name={hiddenInputName} value={JSON.stringify(serializable)} />

      <ul className="flex flex-col gap-2">
        {slots.map((slot, idx) => (
          <li key={slot.key} className="flex items-center gap-2">
            <span className="text-xs text-ink-300 tabular-nums">{idx + 1}</span>
            <div className="flex-1">
              <DateTimePicker
                name={`_timeslot_${slot.key}`}
                defaultValue={slot.startsAt}
                onChange={(value) => updateSlot(slot.key, value)}
              />
            </div>
            {slots.length > MIN && (
              <button
                type="button"
                aria-label="Supprimer ce créneau"
                onClick={() => removeSlot(slot.key)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-erreur-50 hover:text-erreur-700"
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {slots.length < MAX && (
        <button
          type="button"
          onClick={addSlot}
          className="mt-1 inline-flex items-center gap-1.5 self-start text-sm text-acid-700 underline-offset-4 hover:underline"
        >
          <Plus size={14} />
          Ajouter un créneau
        </button>
      )}

      {error && <p className="text-xs text-erreur-700">{error}</p>}
    </div>
  );
}
