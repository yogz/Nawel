// Helpers tab `/admin/stat` partagés entre le Server Component (page.tsx
// qui parse le searchParam côté serveur) et le Client Component
// (`<DashboardTabs>`). Garder cette logique dans un fichier sans
// `"use client"` — sinon le serveur ne peut pas l'appeler (Next.js
// traite tous les exports d'un module client comme des references).

const TAB_KEYS = ["wizard", "outing", "auth"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const DASHBOARD_TAB_KEYS: readonly TabKey[] = TAB_KEYS;

export function parseTabKey(raw: string | string[] | undefined): TabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "wizard" || value === "outing" || value === "auth") {
    return value;
  }
  return "wizard";
}
