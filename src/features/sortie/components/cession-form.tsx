"use client";

import { useActionState, useState } from "react";
import { cedeAllocationAction } from "@/features/sortie/actions/purchase-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

// Re-exported from the shared lib so existing `import { formatAllocationLabel }
// from "@/features/sortie/components/cession-form"` keeps working — the real
// definition lives in the neutral module and can be imported by server
// components directly.
export { formatAllocationLabel } from "@/features/sortie/lib/format-allocation";

type Target = { id: string; name: string };

type Props = {
  shortId: string;
  allocationId: string;
  label: string;
  targets: Target[];
  locked: boolean;
};

export function CessionForm({ shortId, allocationId, label, targets, locked }: Props) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    cedeAllocationAction,
    {} as FormActionState
  );
  const [target, setTarget] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!target) {
      e.preventDefault();
      return;
    }
    const name = targets.find((t) => t.id === target)?.name ?? "cette personne";
    if (!window.confirm(`Céder ${label} à ${name} ?`)) {
      e.preventDefault();
    }
  }

  if (locked) {
    return (
      <p className="text-xs text-encre-400">
        Paiements déjà déclarés — les places ne sont plus transférables.
      </p>
    );
  }

  if (targets.length === 0) {
    return <p className="text-xs text-encre-400">Personne d&rsquo;autre à qui céder.</p>;
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 text-xs"
    >
      <input type="hidden" name="shortId" value={shortId} />
      <input type="hidden" name="allocationId" value={allocationId} />
      <select
        name="targetParticipantId"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="h-8 rounded-md border border-ivoire-400 bg-ivoire-50 px-2 text-xs text-encre-600"
      >
        <option value="">Céder à…</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !target}
        className="text-bordeaux-700 underline-offset-4 hover:underline disabled:opacity-40"
      >
        {pending ? "…" : "Céder"}
      </button>
      {state.message && <p className="text-erreur-700">{state.message}</p>}
    </form>
  );
}
