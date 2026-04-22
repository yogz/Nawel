"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  label: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
};

export function GuestCountStepper({
  label,
  name,
  value,
  min = 0,
  max = 10,
  onChange,
  disabled = false,
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-encre-500">{label}</span>
      <div
        className="inline-flex items-center rounded-full border border-ivoire-400 bg-ivoire-50"
        role="group"
      >
        <button
          type="button"
          onClick={dec}
          disabled={disabled || value <= min}
          aria-label={`Moins de ${label}`}
          className="grid size-11 place-items-center rounded-full text-encre-500 transition-colors hover:text-bordeaux-700 disabled:opacity-40"
        >
          <Minus size={18} />
        </button>
        <span
          aria-live="polite"
          className="min-w-[2.5rem] text-center font-serif text-lg text-encre-700"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={disabled || value >= max}
          aria-label={`Plus de ${label}`}
          className="grid size-11 place-items-center rounded-full text-encre-500 transition-colors hover:text-bordeaux-700 disabled:opacity-40"
        >
          <Plus size={18} />
        </button>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
