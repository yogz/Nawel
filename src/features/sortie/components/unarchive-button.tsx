"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { unarchiveOutingAction } from "@/features/sortie/actions/outing-actions";
import type { FormActionState } from "@/features/sortie/actions/outing-actions";

type Props = {
  shortId: string;
};

/**
 * Small "Restaurer" button rendered next to each archived outing in the
 * /moi settings page. Complements the 5-second undo toast fired at
 * archive time — the toast is the happy path (instant regret), this
 * button is the escape hatch for anyone who missed it.
 */
export function UnarchiveButton({ shortId }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    async (prev, fd) => {
      const result = await unarchiveOutingAction(prev, fd);
      router.refresh();
      return result;
    },
    {} as FormActionState
  );

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="shortId" value={shortId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-bordeaux-700 underline-offset-4 hover:underline disabled:opacity-50"
      >
        <Undo2 size={12} strokeWidth={2.2} />
        {pending ? "…" : "Restaurer"}
      </button>
      {state.message && <span className="sr-only">{state.message}</span>}
    </form>
  );
}
