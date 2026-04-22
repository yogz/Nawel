export type AllocationPlan = {
  participantId: string;
  isChild: boolean;
};

/**
 * Deterministic allocation plan: for each confirmed participant (sorted by
 * responded_at asc, id as tie-breaker), emit one entry per adult seat then
 * one per child seat. Both client (for nominal-mode inputs) and server (for
 * writes + debt computation) call this with the same input, so the Nth
 * nominal input always maps to the Nth plan entry and reorders can't slip
 * between page load and submit.
 */
export function buildAllocationPlan(
  rows: Array<{ id: string; respondedAt: Date; extraAdults: number; extraChildren: number }>
): AllocationPlan[] {
  const sorted = [...rows].sort((a, b) => {
    const t = a.respondedAt.getTime() - b.respondedAt.getTime();
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
  const plan: AllocationPlan[] = [];
  for (const p of sorted) {
    for (let i = 0; i < 1 + p.extraAdults; i++) {
      plan.push({ participantId: p.id, isChild: false });
    }
    for (let i = 0; i < p.extraChildren; i++) {
      plan.push({ participantId: p.id, isChild: true });
    }
  }
  return plan;
}
