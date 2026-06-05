import { Input } from "@/components/ui/input";

export type PricingMode = "unique" | "category" | "nominal";

export const MODE_COPY: Record<PricingMode, { title: string; hint: string }> = {
  unique: { title: "Prix unique", hint: "Tout le monde au même prix." },
  category: { title: "Par catégorie", hint: "Un prix adulte, un prix enfant." },
  nominal: { title: "Prix nominatif", hint: "Chacun son tarif (réduits, jeunes…)." },
};

/**
 * Parse un montant saisi en euros (« 31,75 » ou « 31.75 ») vers des centimes
 * entiers. Tout ce qui n'est pas un nombre positif retombe à 0 — le serveur
 * re-valide de toute façon via Zod.
 */
export function parseEuros(raw: string): number {
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.round(n * 100);
}

/**
 * Centimes → valeur initiale d'un champ euros (« 3175 » → « 31,75 »,
 * « 2000 » → « 20 »). Sert à pré-remplir le formulaire d'édition.
 */
export function centsToEuroInput(cents: number): string {
  const euros = cents / 100;
  const str = Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
  return str.replace(".", ",");
}

export function EuroInput({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="pr-7"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-400">
        €
      </span>
    </div>
  );
}
