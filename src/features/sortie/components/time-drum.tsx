"use client";

import { useState } from "react";

type Props = {
  selected: string | null;
  onSelect: (time: string) => void;
};

// Cultural curtain times cluster tightly around these slots — 95% of
// evening concerts, theater shows, operas start here. Giving six first-
// class presets kills the 27-chip horizontal scroll the wizard shipped
// with and leaves "Autre heure" as the escape hatch for daytime
// matinées, late shows, and anything outside the cluster.
const PRESETS = ["19:00", "19:30", "20:00", "20:30", "21:00"] as const;

/**
 * Time selector: five preset chips + an "Autre heure" that reveals a
 * native `<input type="time" step="900">`. Native means iOS renders its
 * wheel and Android renders its clock without any JS — the two
 * platforms that lose nothing from custom wheel attempts. Export name
 * stays `TimeDrum` for historical-import-stability; the visual shape
 * is now a preset grid, not a wheel.
 */
export function TimeDrum({ selected, onSelect }: Props) {
  const isPreset = selected !== null && (PRESETS as readonly string[]).includes(selected);
  const [customOpen, setCustomOpen] = useState(selected !== null && !isPreset);

  function pick(t: string) {
    setCustomOpen(false);
    onSelect(t);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((t) => {
          const isSelected = !customOpen && selected === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => pick(t)}
              aria-pressed={isSelected}
              className={`flex h-14 items-center justify-center rounded-xl border-2 text-lg font-black tabular-nums tracking-tight transition-colors ${
                isSelected
                  ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
                  : "border-encre-100 bg-white text-encre-700 active:scale-95"
              }`}
            >
              {t.replace(":", "h")}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustomOpen(true);
            if (!selected || (PRESETS as readonly string[]).includes(selected)) {
              onSelect("20:00");
            }
          }}
          aria-pressed={customOpen}
          className={`flex h-14 items-center justify-center rounded-xl border-2 text-sm font-bold transition-colors ${
            customOpen
              ? "border-bordeaux-600 bg-bordeaux-600 text-ivoire-50"
              : "border-dashed border-bordeaux-300 bg-transparent text-bordeaux-600 active:scale-95"
          }`}
        >
          Autre heure
        </button>
      </div>

      {customOpen && (
        <div className="flex items-center gap-3 rounded-xl border border-encre-100 bg-white p-3">
          <label
            htmlFor="custom-time-input"
            className="text-xs font-black uppercase tracking-[0.12em] text-encre-400"
          >
            Heure
          </label>
          <input
            id="custom-time-input"
            type="time"
            step="900"
            value={selected ?? "20:00"}
            onChange={(e) => onSelect(e.target.value)}
            className="ml-auto rounded-md border border-encre-100 bg-ivoire-50 px-3 py-2 text-lg font-black tabular-nums tracking-tight text-encre-700"
          />
        </div>
      )}
    </div>
  );
}
