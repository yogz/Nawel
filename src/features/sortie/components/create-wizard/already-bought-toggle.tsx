"use client";

/**
 * Case « J'ai déjà les billets » de l'étape date du wizard (comptes
 * connectés, date fixe). Même carte que « Me prévenir par email ».
 * Cf. docs/superpowers/specs/2026-10-28-sortie-already-bought-design.md.
 */
export function AlreadyBoughtToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-ink-300 bg-surface-200 p-4 text-sm text-ink-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby="already-bought-help"
        className="mt-0.5 h-4 w-4 accent-acid-600"
      />
      <span className="flex flex-col">
        <span className="font-bold text-ink-700">J&rsquo;ai déjà les billets</span>
        <span id="already-bought-help" className="text-xs text-ink-400">
          Personne n&rsquo;est invité à répondre. Tu indiques qui vient, puis le prix.
        </span>
      </span>
    </label>
  );
}
