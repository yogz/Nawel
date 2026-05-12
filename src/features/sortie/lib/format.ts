/**
 * Pure formatters and shared shapes consumed by both server queries
 * and client components. No "use client" / "use server" boundary —
 * safe to import from either side.
 */

export type PersonRef = {
  id: string;
  anonName: string | null;
  userName: string | null;
};

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function personName(p: PersonRef): string {
  return p.userName ?? p.anonName ?? "Quelqu'un";
}
