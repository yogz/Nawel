"use client";

export type Vibe = "theatre" | "opera" | "concert" | "cine" | "expo" | "autre";

export const VIBE_OPTIONS: Array<{ value: Vibe; label: string }> = [
  { value: "theatre", label: "Théâtre" },
  { value: "opera", label: "Opéra" },
  { value: "concert", label: "Concert" },
  { value: "cine", label: "Ciné" },
  { value: "expo", label: "Expo" },
  { value: "autre", label: "Autre" },
];

type Props = {
  value: Vibe | null;
  onChange: (next: Vibe | null) => void;
};

/**
 * Horizontal scrollable row of category chips at the top of the
 * create wizard's `paste` step. Optional — tapping the current
 * selection again clears it.
 *
 * Styling per UX review: compact `h-9` chips, no icons (label alone
 * reads clearer at this size), cobalt-solid when selected to match
 * the app's CTA vocabulary (not the pastel VibeButtons from the
 * home — those signal exploration, this signals tagging).
 */
export function VibePicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-encre-400">
        C&rsquo;est quoi&nbsp;?
      </p>
      <div className="relative">
        <div className="-mx-6 overflow-x-auto px-6 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-2">
            {VIBE_OPTIONS.map((opt) => {
              const active = value === opt.value;
              return (
                <li key={opt.value} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onChange(active ? null : opt.value)}
                    aria-pressed={active}
                    className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors active:scale-95 ${
                      active
                        ? "bg-bordeaux-600 text-ivoire-50"
                        : "border-2 border-encre-100 bg-white text-encre-700 hover:border-encre-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {/* Right-edge fade to hint at scrollable content. Uses the
            sortie cream surface colour so it blends with whatever
            step background sits behind — no hardcoded bg needed. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--sortie-cream)] to-transparent"
        />
      </div>
    </div>
  );
}
