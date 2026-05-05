"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const RANGES = [
  { days: 1, label: "24h" },
  { days: 7, label: "7j" },
  { days: 28, label: "28j" },
  { days: 90, label: "90j" },
] as const;

type Props = {
  current: number;
};

/**
 * Picker de période pour le dashboard stats. Pousse la valeur via
 * searchParam `range` — la page server re-fetch via les revalidate
 * inhérents aux next: { revalidate } des fetchs Umami. Pas de state
 * client, l'URL est la source de vérité (back/forward navigent
 * entre les ranges).
 */
export function StatRangePicker({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setRange(days: number) {
    const next = new URLSearchParams(searchParams);
    next.set("range", String(days));
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Période d'analyse"
      className="inline-flex items-center gap-1 rounded-full border border-surface-400 bg-surface-100 p-1 font-mono text-[11px] uppercase tracking-[0.18em]"
    >
      {RANGES.map((r) => {
        const active = r.days === current;
        return (
          <button
            key={r.days}
            type="button"
            role="tab"
            aria-selected={active}
            aria-busy={pending && !active ? "true" : undefined}
            onClick={() => !active && setRange(r.days)}
            className={`inline-flex h-8 min-w-[44px] items-center justify-center rounded-full px-3 transition-colors ${
              active
                ? "bg-acid-600 text-surface-50"
                : "text-ink-500 hover:bg-surface-200 hover:text-ink-700"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
