"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "wizard", label: "Wizard" },
  { key: "outing", label: "Outing" },
  { key: "auth", label: "Auth" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Props = {
  /**
   * Onglet présélectionné côté serveur depuis `searchParams.tab`.
   * Le Server Component lit la valeur, on la passe ici pour synchroniser
   * l'état initial — ça évite un flash visuel au mount.
   */
  current: TabKey;
  wizard: ReactNode;
  outing: ReactNode;
  auth: ReactNode;
};

/**
 * Sélecteur d'onglets pour la deuxième moitié du dashboard `/admin/stat`
 * (Wizard / Outing / Auth). État porté par `searchParams.tab` pour que
 * la sélection survive au reload et soit shareable. Optimistic update via
 * `useTransition` pour un toggle instantané même si la navigation pousse
 * un nouveau RSC payload (les enfants sont déjà rendus côté serveur,
 * c'est juste l'affichage qui change).
 *
 * Pourquoi tout les enfants rendus côté serveur, pas en lazy server-fetch
 * par tab : `wizardUmami` est déjà chargé par la page parente. Render
 * d'un onglet caché coûte des marshalls RSC, pas de fetch supplémentaire.
 * Dérivable plus tard en lazy server tabs si la cardinalité explose.
 */
export function DashboardTabs({ current, wizard, outing, auth }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setTab(key: TabKey) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Sections détaillées"
        className="inline-flex items-center gap-1 self-start rounded-full border border-surface-400 bg-surface-100 p-1 font-mono text-[11px] uppercase tracking-[0.18em]"
      >
        {TABS.map((tab) => {
          const active = tab.key === current;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-busy={pending && !active ? "true" : undefined}
              onClick={() => !active && setTab(tab.key)}
              className={`inline-flex h-9 min-w-[72px] items-center justify-center rounded-full px-4 transition-colors ${
                active
                  ? "bg-acid-600 text-surface-50"
                  : "text-ink-500 hover:bg-surface-200 hover:text-ink-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {current === "wizard" && wizard}
        {current === "outing" && outing}
        {current === "auth" && auth}
      </div>
    </section>
  );
}

export const DASHBOARD_TAB_KEYS: readonly TabKey[] = TABS.map((t) => t.key);

export function parseTabKey(raw: string | string[] | undefined): TabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "wizard" || value === "outing" || value === "auth") {
    return value;
  }
  return "wizard";
}
